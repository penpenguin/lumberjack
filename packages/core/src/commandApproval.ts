import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { access, readFile, realpath } from 'node:fs/promises'
import { basename, isAbsolute, join, resolve } from 'node:path'
import { minimatch } from 'minimatch'
import { LumberjackError } from '@shared/errors'
import type { ApprovedCommandRecord } from '@shared/types'

export interface CommandSpec {
  command: string
  args: string[]
  cwd?: string
}

export interface CommandDecision {
  spec: CommandSpec
  resolvedPath?: string
  hash?: string
  status: 'approved' | 'needs_approval' | 'denied'
  reason?: string
}

const DEFAULT_ALLOWLIST = [
  '**/git',
  '**/gh',
  '**/glab',
  '**/node',
  '**/npm',
  '**/npx',
]

const DENYLIST: Array<{ command: string; argPrefixes: string[][] }> = [
  { command: 'bash', argPrefixes: [['-c'], ['--noprofile', '-c']] },
  { command: 'sh', argPrefixes: [['-c']] },
  { command: 'python', argPrefixes: [['-c']] },
  { command: 'python3', argPrefixes: [['-c']] },
  { command: 'node', argPrefixes: [['-e']] },
]

export class CommandApprovalService {
  private allowlist: string[]

  constructor({ allowlist }: { allowlist?: string[] } = {}) {
    this.allowlist = allowlist ?? DEFAULT_ALLOWLIST
  }

  async evaluate(
    commands: CommandSpec[],
    approved: ApprovedCommandRecord[]
  ): Promise<CommandDecision[]> {
    const decisions: CommandDecision[] = []
    for (const spec of commands) {
      const resolvedPath = await resolveCommandPath(spec.command, spec.cwd)
      const commandName = basename(resolvedPath)
      if (!isAllowlisted(resolvedPath, this.allowlist)) {
        decisions.push({
          spec,
          resolvedPath,
          status: 'denied',
          reason: 'command_not_allowlisted',
        })
        continue
      }
      if (isDangerous(commandName, spec.args)) {
        decisions.push({
          spec,
          resolvedPath,
          status: 'denied',
          reason: 'dangerous_arg_combo',
        })
        continue
      }
      const hash = await hashFile(resolvedPath)
      const matched = approved.find((entry) => {
        if (entry.commandPath !== resolvedPath) return false
        if (entry.hash !== hash) return false
        return argsMatch(entry.argsPattern, spec.args)
      })
      if (matched) {
        decisions.push({ spec, resolvedPath, hash, status: 'approved' })
        continue
      }
      const existing = approved.find(
        (entry) => entry.commandPath === resolvedPath
      )
      decisions.push({
        spec,
        resolvedPath,
        hash,
        status: 'needs_approval',
        reason: existing ? 'hash_or_args_changed' : 'new_command',
      })
    }
    return decisions
  }
}

export const resolveCommandPath = async (
  command: string,
  cwd?: string
): Promise<string> => {
  if (isAbsolute(command) || command.includes('/')) {
    const resolved = resolve(cwd ?? process.cwd(), command)
    await access(resolved)
    return realpath(resolved)
  }
  const envPath = process.env.PATH ?? ''
  const segments = envPath.split(':')
  for (const segment of segments) {
    if (!segment) continue
    const candidate = join(segment, command)
    try {
      await access(candidate)
      return realpath(candidate)
    } catch {
      continue
    }
  }
  throw new LumberjackError('COMMAND_NOT_FOUND', 'Command not found', {
    command,
  })
}

export const loadGlobalAllowlist = async (projectRoot: string) => {
  try {
    const raw = await readFile(
      join(projectRoot, '.lumberjack', 'allowlist.json'),
      'utf-8'
    )
    const parsed = JSON.parse(raw)
    if (
      Array.isArray(parsed) &&
      parsed.every((item) => typeof item === 'string')
    ) {
      return parsed
    }
  } catch {
    // ignore
  }
  return DEFAULT_ALLOWLIST
}

const isAllowlisted = (commandPath: string, allowlist: string[]) =>
  allowlist.some((pattern) =>
    minimatch(commandPath, pattern, { matchBase: true })
  )

const isDangerous = (commandName: string, args: string[]): boolean => {
  const normalizedArgs = normalizeArgs(args)
  const rule = DENYLIST.find((entry) => entry.command === commandName)
  if (!rule) return false
  return rule.argPrefixes.some((prefix) =>
    prefix.every((arg, index) => normalizedArgs[index] === arg)
  )
}

const normalizeArgs = (args: string[]): string[] =>
  args.filter((arg) => !['--noprofile', '--norc'].includes(arg))

const argsMatch = (pattern: string[], args: string[]): boolean => {
  if (pattern.length > args.length) return false
  return pattern.every((value, index) => value === args[index])
}

export const hashFile = (path: string): Promise<string> =>
  new Promise((resolveHash, reject) => {
    const hash = createHash('sha256')
    const stream = createReadStream(path)
    stream.on('error', reject)
    stream.on('data', (chunk) => hash.update(chunk))
    stream.on('end', () => resolveHash(hash.digest('hex')))
  })
