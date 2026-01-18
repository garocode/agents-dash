import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function runCliCommand(command: string): Promise<unknown> {
  try {
    const { stdout } = await execAsync(command, {
      env: { ...process.env, LOG_LEVEL: '0', CCUSAGE_OFFLINE: '1' },
      maxBuffer: 10 * 1024 * 1024
    })
    return JSON.parse(stdout)
  } catch (error) {
    throw new Error(`CLI command failed: ${String(error)}`)
  }
}

export async function runOpenCodeCli(command: string): Promise<unknown> {
  try {
    const { stdout } = await execAsync(command, {
      env: { ...process.env, LOG_LEVEL: '0' },
      maxBuffer: 10 * 1024 * 1024
    })
    const lines = stdout.split('\n')
    const jsonStart = lines.findIndex((line) => line.trim().startsWith('{'))
    const jsonStr = jsonStart >= 0 ? lines.slice(jsonStart).join('\n') : stdout
    return JSON.parse(jsonStr)
  } catch (error) {
    throw new Error(`OpenCode CLI command failed: ${String(error)}`)
  }
}
