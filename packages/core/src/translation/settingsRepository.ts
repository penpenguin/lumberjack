import sqliteModule from 'node-sqlite3-wasm'
import type { TranslationSettings } from '@shared/translation/types'

type DatabaseLike = {
  exec: (sql: string) => void
  run: (sql: string, params?: Record<string, unknown>) => void
  get: (sql: string, params?: Record<string, unknown>) => unknown
  close: () => void
}

type SqliteModule = {
  Database: new (dbPath: string) => DatabaseLike
}

const defaultSqliteModule = sqliteModule as unknown as SqliteModule

export type SettingsRepositoryDeps = {
  dbPath?: string
  sqliteModule?: SqliteModule
}

const schema = `
  CREATE TABLE IF NOT EXISTS translation_settings (
    id TEXT PRIMARY KEY,
    systemPrompt TEXT,
    customPrompt TEXT,
    targetLanguage TEXT NOT NULL,
    backTranslate INTEGER NOT NULL,
    agentTimeoutMs INTEGER NOT NULL,
    endpointUrl TEXT,
    updatedAt TEXT NOT NULL
  );
`

const toSettings = (row?: Record<string, unknown>): TranslationSettings | null => {
  if (!row) return null
  return {
    systemPrompt: row.systemPrompt as string | undefined,
    customPrompt: row.customPrompt as string | undefined,
    targetLanguage: row.targetLanguage as string,
    backTranslate: Boolean(row.backTranslate),
    agentTimeoutMs: row.agentTimeoutMs as number,
    endpointUrl: typeof row.endpointUrl === 'string' ? row.endpointUrl : '',
    updatedAt: row.updatedAt as string,
  }
}

export const createSettingsRepository = (deps: SettingsRepositoryDeps = {}) => {
  const dbPath = deps.dbPath ?? 'translation-settings.db'
  const sqlite = deps.sqliteModule ?? defaultSqliteModule
  const db = new sqlite.Database(dbPath)

  db.exec(schema)

  const getSettings = () => {
    const row = db.get(
      `
      SELECT * FROM translation_settings
      WHERE id = :id
      `,
      { ':id': 'default' }
    ) as Record<string, unknown> | undefined
    return toSettings(row)
  }

  const saveSettings = (settings: TranslationSettings) => {
    db.run(
      `
      INSERT INTO translation_settings (
        id,
        systemPrompt,
        customPrompt,
        targetLanguage,
        backTranslate,
        agentTimeoutMs,
        endpointUrl,
        updatedAt
      ) VALUES (
        :id,
        :systemPrompt,
        :customPrompt,
        :targetLanguage,
        :backTranslate,
        :agentTimeoutMs,
        :endpointUrl,
        :updatedAt
      )
      ON CONFLICT(id) DO UPDATE SET
        systemPrompt = excluded.systemPrompt,
        customPrompt = excluded.customPrompt,
        targetLanguage = excluded.targetLanguage,
        backTranslate = excluded.backTranslate,
        agentTimeoutMs = excluded.agentTimeoutMs,
        endpointUrl = excluded.endpointUrl,
        updatedAt = excluded.updatedAt
      `,
      {
        ':id': 'default',
        ':systemPrompt': settings.systemPrompt ?? null,
        ':customPrompt': settings.customPrompt ?? null,
        ':targetLanguage': settings.targetLanguage,
        ':backTranslate': settings.backTranslate ? 1 : 0,
        ':agentTimeoutMs': settings.agentTimeoutMs,
        ':endpointUrl': settings.endpointUrl ?? null,
        ':updatedAt': settings.updatedAt,
      }
    )
    return settings
  }

  const close = () => {
    db.close()
  }

  return { getSettings, saveSettings, close }
}
