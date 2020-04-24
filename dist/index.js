#!/usr/bin/env node
"use strict";

var _fs = require("fs");

var _os = require("os");

var _child_process = require("child_process");

var _inquirer = _interopRequireDefault(require("inquirer"));

var _options = _interopRequireDefault(require("../options.json"));

var _utils = _interopRequireDefault(require("./utils"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

async function init() {
  const CREATE_BUNDLE = 'Criar um conjunto de projetos (aka: Solution)';
  const CREATE_PROJECT = 'Criar um novo projeto';
  const UPDATE_PROJECT = 'Adicionar uma funcionalidade';
  const PUBLISH = 'Publicar projeto';
  const EXIT = 'Encerrar!';
  const answers = await _inquirer.default.prompt([{
    type: 'rawlist',
    name: 'action',
    message: 'O que deseja fazer?',
    choices: [CREATE_BUNDLE, CREATE_PROJECT, UPDATE_PROJECT, PUBLISH, EXIT]
  }]);

  switch (answers.action) {
    case CREATE_BUNDLE:
      await createBundle();
      break;

    case CREATE_PROJECT:
      await createProject();
      break;

    default:
      return true;
  }
}

async function createBundle() {
  const bundleChoices = _options.default.bundles.map(b => b.name);

  const settings = await _inquirer.default.prompt([{
    type: 'rawlist',
    name: 'bundle',
    message: 'Escolha um conjunto de projetos',
    choices: bundleChoices
  }, {
    name: 'sponsor',
    message: 'Digite o nome do cliente',
    transformer: _utils.default.capitalize,
    filter: _utils.default.capitalize,
    validate: i => !!i
  }, {
    name: 'solutionName',
    message: 'Digite o nome da solução',
    transformer: _utils.default.capitalize,
    filter: _utils.default.capitalize,
    validate: i => !!i
  }, {
    type: 'confirm',
    name: 'multiRepo',
    message: 'Deseja versionar os projetos individualmente?',
    default: true
  }, {
    type: 'confirm',
    name: 'setOrigin',
    message: 'Atribuir um repositório remoto?',
    when: a => !a.multiRepo
  }, {
    name: 'originUrl',
    message: 'Digite a url do repositório remoto',
    validate: i => !!i,
    when: a => !!a.setOrigin
  }]);
  settings.solutionName = `${settings.sponsor}.${settings.solutionName}`;
  settings.solutionDir = `${process.cwd()}/${settings.solutionName}`;

  try {
    await _fs.promises.access(settings.solutionDir);
    console.log(`Não foi possível concluir a criação da solução.`);
    console.log(`Já existe uma solução ${settings.solutionName} neste diretório.`);
    return;
  } catch (e) {
    await _fs.promises.mkdir(settings.solutionDir);
  }

  const bundle = _options.default.bundles.find(b => b.name == settings.bundle);

  for (const project of bundle.projects) {
    await createProject(project, settings);
  }

  if (!settings.multiRepo) {
    (0, _child_process.execSync)(`git init`, {
      cwd: settings.solutionDir,
      stdio: 'pipe'
    });
    if (!settings.setOrigin) return;

    try {
      (0, _child_process.execSync)(`git remote add origin ${settings.originUrl}`, {
        cwd: settings.solutionDir,
        stdio: 'pipe'
      });
    } catch (e) {
      console.log('Não foi possível associar o repositório remoto à solução.');
    }
  }
}

async function createProject(project, settings) {
  if (project) {
    const answers = await _inquirer.default.prompt([{
      type: 'confirm',
      name: 'setOrigin',
      message: `Atribuir um repositório remoto para o projeto (${project.suffix})?`,
      when: a => a.multiRepo
    }, {
      name: 'originUrl',
      message: 'Digite a url do repositório remoto',
      validate: i => !!i,
      when: a => !!a.setOrigin
    }]);
    const dir = `${settings.solutionName}/${settings.solutionName}.${project.suffix}`;
    const name = `${settings.solutionName}.${project.suffix}`;
    settings = { ...settings,
      ...answers,
      dir,
      name
    };
    project = _options.default.projects.find(p => p.id == project.id);
  } else {
    const projectChoices = _options.default.projects.map(p => p.name);

    const answers = await _inquirer.default.prompt([{
      type: 'rawlist',
      name: 'projectType',
      message: 'Escolha um tipo de projeto',
      choices: projectChoices
    }, {
      name: 'sponsor',
      message: 'Digite o nome do cliente',
      transformer: _utils.default.capitalize,
      filter: _utils.default.capitalize,
      validate: i => !!i
    }, {
      name: 'name',
      message: 'Digite o nome do projeto',
      transformer: _utils.default.capitalize,
      filter: _utils.default.capitalize,
      validate: i => !!i
    }, {
      type: 'confirm',
      name: 'setOrigin',
      message: 'Atribuir um repositório remoto?'
    }, {
      name: 'originUrl',
      message: 'Digite a url do repositório remoto',
      validate: i => !!i,
      when: a => !!a.setOrigin
    }]);
    settings = { ...answers,
      dir: `${answers.sponsor}.${answers.name}`
    };
    project = _options.default.projects.find(p => p.name == answers.projectType);
  }

  const projectCli = await downloadProject(project);
  await projectCli.create({ ...project,
    ...settings
  }, _utils.default);

  if (!settings.bundle || settings.multiRepo) {
    (0, _child_process.execSync)(`git init`, {
      cwd: settings.dir,
      stdio: 'pipe'
    });
    if (!settings.setOrigin) return;

    try {
      (0, _child_process.execSync)(`git remote add origin ${settings.originUrl}`, {
        cwd: settings.solutionDir,
        stdio: 'pipe'
      });
    } catch (e) {
      console.log('Não foi possível associar o repositório remoto ao projeto.');
    }
  }
}

async function downloadProject(project) {
  const sourcesDir = `${(0, _os.homedir)()}/.itlab-io`;
  const projectDir = `${sourcesDir}/${project.id}`;

  try {
    await _fs.promises.access(sourcesDir);
  } catch (e) {
    await _fs.promises.mkdir(sourcesDir);
  }

  let update = false;

  try {
    await _fs.promises.access(projectDir);
    update = true;
  } catch (e) {
    console.log(`Baixando template ${project.name} ...`);
    (0, _child_process.execSync)(`git clone ${project.url} ${projectDir}`, {
      stdio: 'pipe'
    });
  }

  if (update) {
    console.log(`Atualizando template ${project.name} ...`);
    (0, _child_process.execSync)(`git pull origin master`, {
      cwd: projectDir,
      stdio: 'pipe'
    });
  }

  console.log(`Restaurando pacotes do template ${project.name} ...`);
  (0, _child_process.execSync)(`npm i --unsafe-perm`, {
    cwd: `${projectDir}/cli`,
    stdio: 'pipe'
  });
  return require(`${projectDir}/cli/dist`);
}

async function main() {
  try {
    console.log('------------------------------------------------------');
    console.log('Bem vindo a CLI de bootstraping do Template IT Lab');
    console.log('------------------------------------------------------');
    let exit = false;

    while (!exit) exit = await init();
  } catch (e) {
    console.log(e);
  }
}

main().then(process.exit);