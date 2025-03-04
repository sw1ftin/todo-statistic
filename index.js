const {getAllFilePathsWithExtension, readFile} = require('./fileSystem');
const {readLine} = require('./console');

const files = getFiles();

let todos = [];

console.log('Please, write your command!');
readLine(processCommand);

function getFiles() {
    const filePaths = getAllFilePathsWithExtension(process.cwd(), 'js');
    return filePaths.map(path => readFile(path));
}

function processCommand(command) {
    if (command.startsWith('user ')) {
        const username = command.slice(5).toLowerCase();
        todos = parseTodo();
        const userTodos = todos.filter(todo => {
            const match = todo.match(/^([^;]+)/);
            return match && match[1].trim().toLowerCase() === username;
        });
        for (let todo of userTodos) {
            console.log(todo);
        }
        return;
    }

    switch (command) {
        case 'exit':
            process.exit(0);
            break;
        case 'show':
            todos = parseTodo();
            for (let todo of todos) {
                console.log(todo);
            }
            break;
        case 'important':
            todos = parseTodo();
            const importantTodos = todos.filter(todo => todo.includes('!'));
            for (let todo of importantTodos) {
                console.log(todo);
            }
            break;
        default:
            console.log('wrong command');
            break;
    }
}

// TODO Jakob; 2025-03-02; Сделать практику!
function parseTodo() {
    const comments = [];
    for (const file of files) {
        const lines = file.split('\r\n');
        for (const line of lines) {
            const todoIndex = line.indexOf('// TODO');
            if (todoIndex !== -1 && !line.includes('\'// TODO')) {
                const todoText = line.slice(todoIndex + 7).trim();
                comments.push(todoText);
            }
        }
    }
    return comments;
}
