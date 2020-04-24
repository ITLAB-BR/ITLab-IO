#!/usr/bin/env node
import { promises as fs } from 'fs';
import { homedir } from 'os';
import { execSync } from 'child_process';
import inquirer from 'inquirer';
import options from '../options.json';
import utils from './utils';

async function init() {
    const CREATE_BUNDLE = 'Criar um conjunto de projetos (aka: Solution)';
    const CREATE_PROJECT = 'Criar um novo projeto';
    const UPDATE_PROJECT = 'Adicionar uma funcionalidade';
    const PUBLISH = 'Publicar projeto';
    const EXIT = 'Encerrar!';

    const answers = await inquirer.prompt([{
        type: 'rawlist',
        name: 'action',
        message: 'O que deseja fazer?',
        choices: [
            CREATE_BUNDLE,
            CREATE_PROJECT,
            UPDATE_PROJECT,
            PUBLISH,
            EXIT
        ]
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
    const bundleChoices = options.bundles.map(b => b.name);

    const settings = await inquirer.prompt([{
        type: 'rawlist',
        name: 'bundle',
        message: 'Escolha um conjunto de projetos',
        choices: bundleChoices
    }, {
        name: 'sponsor',
        message: 'Digite o nome do cliente',
        transformer: utils.capitalize,
        filter: utils.capitalize,
        validate: (i) => !!i
    }, {
        name: 'solutionName',
        message: 'Digite o nome da solução',
        transformer: utils.capitalize,
        filter: utils.capitalize,
        validate: (i) => !!i
    }, {
        type: 'confirm',
        name: 'multiRepo',
        message: 'Deseja versionar os projetos individualmente?',
        default: true
    }, {
        type: 'confirm',
        name: 'setOrigin',
        message: 'Atribuir um repositório remoto?',
        when: (a) => !a.multiRepo
    }, {
        name: 'originUrl',
        message: 'Digite a url do repositório remoto',
        validate: (i) => !!i,
        when: (a) => !!a.setOrigin
    }]);

    settings.solutionName = `${settings.sponsor}.${settings.solutionName}`;
    settings.solutionDir = `${process.cwd()}/${settings.solutionName}`;

    try {
        await fs.access(settings.solutionDir);
        console.log(`Não foi possível concluir a criação da solução.`);
        console.log(`Já existe uma solução ${settings.solutionName} neste diretório.`);
        return;
    }
    catch (e) {
        await fs.mkdir(settings.solutionDir);
    }

    const bundle = options.bundles.find(b => b.name == settings.bundle);

    for (const project of bundle.projects) {
        await createProject(project, settings);
    }

    if (!settings.multiRepo) {
        execSync(`git init`, { cwd: settings.solutionDir, stdio: 'pipe' });

        if (!settings.setOrigin) return;

        try {
            execSync(`git remote add origin ${settings.originUrl}`, { cwd: settings.solutionDir, stdio: 'pipe' })
        }
        catch (e) {
            console.log('Não foi possível associar o repositório remoto à solução.');
        }
    }
}

async function createProject(project, settings) {
    if (project) {
        const answers = await inquirer.prompt([{
            type: 'confirm',
            name: 'setOrigin',
            message: `Atribuir um repositório remoto para o projeto (${project.suffix})?`,
            when: (a) => settings.multiRepo
        }, {
            name: 'originUrl',
            message: 'Digite a url do repositório remoto',
            validate: (i) => !!i,
            when: (a) => !!a.setOrigin
        }]);

        const dir = `${settings.solutionName}/${settings.solutionName}.${project.suffix}`;
        const name = `${settings.solutionName}.${project.suffix}`;

        settings = { ...settings, ...answers, dir, name };
        project = options.projects.find(p => p.id == project.id);
    }
    else {
        const projectChoices = options.projects.map(p => p.name);
    
        const answers = await inquirer.prompt([{
            type: 'rawlist',
            name: 'projectType',
            message: 'Escolha um tipo de projeto',
            choices: projectChoices
        }, {
            name: 'sponsor',
            message: 'Digite o nome do cliente',
            transformer: utils.capitalize,
            filter: utils.capitalize,
            validate: (i) => !!i
        }, {
            name: 'name',
            message: 'Digite o nome do projeto',
            transformer: utils.capitalize,
            filter: utils.capitalize,
            validate: (i) => !!i
        }, {
            type: 'confirm',
            name: 'setOrigin',
            message: 'Atribuir um repositório remoto?'
        }, {
            name: 'originUrl',
            message: 'Digite a url do repositório remoto',
            validate: (i) => !!i,
            when: (a) => !!a.setOrigin
        }]);

        settings = { ...answers, dir: `${answers.sponsor}.${answers.name}` };
        project = options.projects.find(p => p.name == answers.projectType);
    }

    const projectCli = await downloadProject(project);
    await projectCli.create({ ...project, ...settings }, utils);

    if (!settings.bundle || settings.multiRepo) {
        execSync(`git init`, { cwd: settings.dir, stdio: 'pipe' });

        if (!settings.setOrigin) return;
        
        try {
            execSync(`git remote add origin ${settings.originUrl}`, { cwd: settings.solutionDir, stdio: 'pipe' })
        }
        catch (e) {
            console.log('Não foi possível associar o repositório remoto ao projeto.');
        }
    }
}

async function downloadProject(project) {
    const sourcesDir = `${homedir()}/.itlab-io`;
    const projectDir = `${sourcesDir}/${project.id}`;

    try {
        await fs.access(sourcesDir);
    }
    catch (e) {
        await fs.mkdir(sourcesDir);
    }

    let update = false;
    try {
        await fs.access(projectDir);
        update = true;
    }
    catch (e) {
        console.log(`Baixando template ${project.name} ...`);
        execSync(`git clone ${project.url} ${projectDir}`, { stdio: 'pipe' });
    }

    if (update) {
        console.log(`Atualizando template ${project.name} ...`);
        execSync(`git pull origin master`, { cwd: projectDir, stdio: 'pipe' });
    }
    
    console.log(`Restaurando pacotes do template ${project.name} ...`);
    execSync(`npm i --unsafe-perm`, { cwd: `${projectDir}/cli`, stdio: 'pipe' });

    return require(`${projectDir}/cli/dist`);
}

async function main() {
    try
    {
        console.log('------------------------------------------------------');
        console.log('Bem vindo a CLI de bootstraping do Template IT Lab');
        console.log('------------------------------------------------------');

        let exit = false;

        while (!exit)
            exit = await init();
    }
    catch (e) {
        console.log(e);
    }
}

main().then(process.exit);