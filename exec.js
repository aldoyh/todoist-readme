const {spawn} = require('child_process');
 
const exec = (cmd, args = [], options = {}) => new Promise((resolve, reject) => {
  console.log(`Started: ${cmd} ${args.join(' ')}`);
  const optionsToCLI = {
    ...options
  };
  if (!optionsToCLI.stdio) {
    Object.assign(optionsToCLI, {stdio: ['inherit', 'inherit', 'inherit']});
  }
  const app = spawn(cmd, args, optionsToCLI);
  app.on('close', code => {
    if (code !== 0) {
      reject(new Error(`Command "${cmd} ${args.join(' ')}" exited with code ${code}`));
      return;
    }
    resolve();
  }
  );

  app.on('error', error => {
    reject(error);
  }
  );

  app.on('exit', code => {
    if (code !== 0) {
      reject(new Error(`Command "${cmd} ${args.join(' ')}" exited with code ${code}`));
      return;
    }
    resolve();
  }
  );

  
});
 
module.exports = exec;