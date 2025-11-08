/* eslint-disable no-console */
import {PostgreSqlContainer, type StartedPostgreSqlContainer} from '@testcontainers/postgresql';
import {runMigrations} from '../../config/migrate';
import {exec} from 'child_process';
import {promisify} from 'util';

const execAsync = promisify(exec);

let container: StartedPostgreSqlContainer | null = null;

/**
 * Check Docker availability and get diagnostics
 */
async function checkDocker(): Promise<void> {
  console.log('🔍 Checking Docker availability...');

  // Try multiple ways to find docker
  const dockerPaths = [
    'docker',
    '/usr/bin/docker',
    '/usr/local/bin/docker',
    process.env.DOCKER_PATH ?? '',
  ].filter(Boolean);

  let dockerCmd = 'docker';
  let dockerFound = false;

  // Try to find docker command
  for (const path of dockerPaths) {
    try {
      await execAsync(`"${path}" --version`);
      dockerCmd = path;
      dockerFound = true;
      console.log(`✓ Found Docker at: ${path}`);
      break;
    } catch {
      // Continue to next path
    }
  }

  if (!dockerFound) {
    // Check if docker socket exists (might be accessible even if command isn't)
    const fs = await import('fs/promises');
    try {
      await fs.access('/var/run/docker.sock');
      console.log('⚠️  Docker command not found in PATH, but socket exists at /var/run/docker.sock');
      console.log('   Testcontainers should still work by accessing the socket directly');
      console.log('   If this fails, try: export PATH=$PATH:/usr/bin');
      // Don't throw, let testcontainers try - it can work with just the socket
      return;
    } catch {
      throw new Error(
        'Docker is not accessible. Docker command not found and socket not accessible.\n' +
          'Please ensure Docker is installed and running, or set USE_TESTCONTAINERS=false to use a manual database.'
      );
    }
  }

  try {
    await execAsync(`"${dockerCmd}" ps`);
    console.log('✓ Docker is accessible');

    // Check if postgres image exists
    try {
      const {stdout: imageCheck} = await execAsync(
        `"${dockerCmd}" images postgres:18-alpine --format "{{.Repository}}:{{.Tag}}"`
      );
      if (imageCheck.trim()) {
        console.log('✓ PostgreSQL image found:', imageCheck.trim());
      } else {
        console.log('⚠️  PostgreSQL image not found locally, will be pulled');
      }
    } catch {
      console.log('⚠️  Could not check for PostgreSQL image');
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Docker is not accessible: ${message}. Please ensure Docker is running, or set USE_TESTCONTAINERS=false.`
    );
  }
}

/**
 * Start a PostgreSQL test container
 * Returns the connection string for the container
 */
export async function startTestContainer(): Promise<string> {
  if (container) {
    console.log('♻️  Reusing existing test container');
    return container.getConnectionUri();
  }

  console.log('🚀 Starting PostgreSQL test container...');
  console.log('💡 Tip: Set DEBUG=testcontainers* for detailed logs');
  const startTime = Date.now();

  // Check Docker first
  await checkDocker();

  try {
    console.log('📦 Creating container configuration...');

    // Create container with explicit startup timeout and log consumer
    // Note: PostgreSqlContainer creates a default database, so we don't need to specify it
    const containerBuilder = new PostgreSqlContainer('postgres:18-alpine')
      .withUsername('test')
      .withPassword('test')
      .withStartupTimeout(120000) // 2 minute startup timeout
      .withLogConsumer((stream) => {
        // Only log important PostgreSQL messages to avoid spam
        stream.on('data', (line: string) => {
          const lineStr = line.toString();
          // Log PostgreSQL ready messages and errors
          if (
            lineStr.includes('ready to accept connections') ||
            lineStr.includes('database system is ready') ||
            lineStr.includes('ERROR') ||
            lineStr.includes('FATAL') ||
            lineStr.includes('WARNING')
          ) {
            console.log(`   📋 [PostgreSQL] ${lineStr.trim()}`);
          }
        });
        stream.on('err', (line: string) => {
          console.error(`   ⚠️  [PostgreSQL Error] ${line.toString().trim()}`);
        });
      });

    console.log('⏳ Starting container (this may take a minute on first run)...');
    console.log('   Image: postgres:18-alpine');
    console.log('   Username: test');
    console.log('   Waiting for PostgreSQL to be ready...');
    console.log('   (PostgreSqlContainer will create a default database automatically)');

    const stepStartTime = Date.now();

    // Wrap in a Promise with timeout to prevent infinite hanging
    const containerStartPromise = containerBuilder.start();

    // Add progress logging
    const progressInterval = setInterval(() => {
      const elapsed = ((Date.now() - stepStartTime) / 1000).toFixed(0);
      console.log(`   ⏳ Still waiting for health check... (${elapsed}s elapsed)`);
    }, 10000); // Log every 10 seconds

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        clearInterval(progressInterval);
        reject(
          new Error(
            'Container startup timed out after 2 minutes. Try setting USE_TESTCONTAINERS=false to use a manual database.'
          )
        );
      }, 120000);
    });

    const startedContainer = await Promise.race([containerStartPromise, timeoutPromise]);
    clearInterval(progressInterval);

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!startedContainer) {
      throw new Error('Container failed to start');
    }

    container = startedContainer;
    const connectionUri = container.getConnectionUri();
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`✅ Test container started successfully!`);
    console.log(`   Connection URI: ${connectionUri.replace(/:[^:@]+@/, ':****@')}`); // Hide password
    console.log(`   Time taken: ${elapsed}s`);

    // Set environment variables for migrations and database connections
    process.env.DATABASE_URL = connectionUri;
    process.env.TEST_DATABASE_URL = connectionUri;

    // Use PostgreSqlContainer's helper methods to get connection details
    // These are more reliable than parsing the URI
    process.env.PGHOST = container.getHost();
    process.env.PGPORT = container.getPort().toString();
    process.env.PGUSER = container.getUsername();
    process.env.PGPASSWORD = container.getPassword();
    process.env.PGDATABASE = container.getDatabase();

    console.log('📊 Connection details:');
    console.log(`   Host: ${process.env.PGHOST}`);
    console.log(`   Port: ${process.env.PGPORT}`);
    console.log(`   Database: ${process.env.PGDATABASE}`);
    console.log(`   User: ${process.env.PGUSER}`);

    // Run migrations on the test container
    console.log('🔄 Running migrations on test container...');
    const migrationStart = Date.now();
    await runMigrations();
    const migrationElapsed = ((Date.now() - migrationStart) / 1000).toFixed(1);
    console.log(`✅ Migrations completed (took ${migrationElapsed}s)`);

    return connectionUri;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    console.error('❌ Failed to start test container');
    console.error(`   Error: ${errorMessage}`);
    if (errorStack) {
      console.error(`   Stack: ${errorStack.split('\n').slice(0, 3).join('\n')}`);
    }

    // Try to get container logs if available
    if (container) {
      try {
        console.log('📋 Container logs:');
        const logsStream = await container.logs();
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (logsStream) {
          // Convert Readable stream to string
          const chunks: Buffer[] = [];
          for await (const chunk of logsStream) {
            chunks.push(Buffer.from(chunk as ArrayBufferLike));
          }
          const logs = Buffer.concat(chunks).toString('utf-8');
          console.log(logs);
        }
      } catch {
        // Ignore log errors
      }
    }

    if (errorMessage.includes('Docker') || errorMessage.includes('docker')) {
      throw new Error(
        'Docker is required for testcontainers. Please ensure Docker is running and accessible. ' +
          'You can check with: docker ps'
      );
    }
    if (errorMessage.includes('timeout') || errorMessage.includes('Timeout')) {
      throw new Error(
        'Container startup timed out. This may happen if Docker is slow or the image needs to be pulled. ' +
          'Try running: docker pull postgres:18-alpine\n' +
          'Or disable testcontainers: USE_TESTCONTAINERS=false pnpm test'
      );
    }
    throw error;
  }
}

/**
 * Stop the test container
 */
export async function stopTestContainer(): Promise<void> {
  if (container) {
    console.log('🛑 Stopping PostgreSQL test container...');
    try {
      await container.stop();
      console.log('✅ Test container stopped');
      container = null;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('⚠️  Error stopping container:', message);
      container = null; // Clear reference even if stop failed
    }
  }
}

/**
 * Get the current test container connection string
 */
export function getTestContainerUri(): string | null {
  return container?.getConnectionUri() ?? null;
}
