import { execSync, spawn } from 'node:child_process';
import { join }            from 'path';
import waitOn              from 'wait-on';

async function run() {
  const baseDir = join(__dirname, '..');
  //
  spawn(
    'npm',
    ['run', 'ng', '--', 'serve',],
    {stdio: 'inherit', shell: true},
  );

  await waitOn({resources: ['http://localhost:4200']});
  execSync(
    `npm --prefix "${join(baseDir, 'electron')}" run start`,
    {stdio: 'inherit'}
  );
}

run()



