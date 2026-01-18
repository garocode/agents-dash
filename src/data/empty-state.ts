import { existsSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'
import type { Agent, EmptyState } from '../types'

export function detectEmptyState(agent: Agent): EmptyState {
  const paths = agent === 'claude' ? getClaudePaths() : getOpenCodePaths()
  const exists = paths.some((p) => existsSync(p))

  if (exists) {
    return { isEmpty: false, missingPaths: [], checklist: [] }
  }

  return {
    isEmpty: true,
    missingPaths: paths,
    checklist: [
      'Install ccusage (or run via bunx/npx).',
      `Run ${agent === 'claude' ? 'Claude Code' : 'OpenCode'} to generate local data.`,
      'Verify data directories exist (see paths).',
      'Pricing cache missing; costs may be zero while offline.'
    ]
  }
}

function getClaudePaths(): string[] {
  const configDir = process.env.CLAUDE_CONFIG_DIR
  if (configDir) {
    return configDir
      .split(',')
      .map((dir) => dir.trim())
      .flatMap((dir) => {
        const paths = [dir]
        if (!dir.endsWith('/projects')) {
          paths.push(join(dir, 'projects'))
        }
        return paths
      })
  }

  return [
    join(homedir(), '.config/claude/projects'),
    join(homedir(), '.claude/projects')
  ]
}

function getOpenCodePaths(): string[] {
  const dataDir = process.env.OPENCODE_DATA_DIR || join(homedir(), '.local/share/opencode')
  return [join(dataDir, 'storage')]
}
