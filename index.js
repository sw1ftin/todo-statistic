const { getAllFilePathsWithExtension, readFile } = require('./fileSystem');
const { readLine } = require('./console');

const files = getFiles();

let todos = [];

console.log('Please, write your command!');
readLine(processCommand);

function getFiles() {
    const filePaths = getAllFilePathsWithExtension(process.cwd(), 'js');
    return filePaths.map(path => readFile(path));
}

function countExclamationMarks(str) {
    return (str.match(/!/g) || []).length;
}

function parseDate(todo) {
    const match = todo.match(/;\s*(\d{4}-\d{2}-\d{2})/);
    return match ? new Date(match[1]) : null;
}

function getUsername(todo) {
    const parts = todo.split(';');
    if (parts.length >= 3) {
        return parts[0].trim();
    }
    return '';
}

function sortByImportance(todos) {
    return todos.sort((a, b) => {
        const aMarks = countExclamationMarks(a);
        const bMarks = countExclamationMarks(b);
        return bMarks - aMarks;
    });
}

function sortByUser(todos) {
    const userGroups = new Map();
    const noUser = [];

    todos.forEach(todo => {
        const username = getUsername(todo).toLowerCase();
        if (username) {
            if (!userGroups.has(username)) {
                userGroups.set(username, []);
            }
            userGroups.get(username).push(todo);
        } else {
            noUser.push(todo);
        }
    });

    const result = [];
    for (const [user, userTodos] of userGroups) {
        result.push(`=== ${user} ===`);
        result.push(...userTodos);
    }

    if (noUser.length > 0) {
        result.push('=== Без автора ===');
        result.push(...noUser);
    }

    return result;
}

function sortByDate(todos) {
    const withDate = [];
    const withoutDate = [];

    todos.forEach(todo => {
        const date = parseDate(todo);
        if (date) {
            withDate.push({ todo, date });
        } else {
            withoutDate.push(todo);
        }
    });

    withDate.sort((a, b) => b.date - a.date);
    return [...withDate.map(item => item.todo), ...withoutDate];
}

function processCommand(command) {
    if (command.startsWith('user ')) {
        getUserData(command);
        return;
    }

    if (command.startsWith('sort ')) {
        sortTodos(command);
        return;
    }

    if (command.startsWith('date ')) {
        filterByDate(command);
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

function filterByDate(command) {
    const dateStr = command.slice(5);
    const parts = dateStr.split('-');
    
    if (parts.length > 3 || parts.length === 0) {
        console.log('Неверный формат даты. Используйте: YYYY[-MM[-DD]]');
        return;
    }

    const [year, month = '01', day = '01'] = parts;
    const targetDate = new Date(`${year}-${month}-${day}`);

    if (isNaN(targetDate.getTime())) {
        console.log('Неверный формат даты');
        return;
    }

    todos = parseTodo();
    const filteredTodos = todos.filter(todo => {
        const todoDate = parseDate(todo);
        return todoDate && todoDate >= targetDate;
    });

    for (let todo of filteredTodos) {
        console.log(todo);
    }
}

// TODO Jakob; 2025-03-04; Сделать практику!!
// TODO unnamed todo for test
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

function getUserData(command) {
    const username = command.slice(5);
    todos = parseTodo();
    const userTodos = todos.filter(todo => getUsername(todo) === username);
    for (let todo of userTodos) {
        console.log(todo);
    }
}

function sortTodos(command) {
    const sortType = command.slice(5);
    todos = parseTodo();
    let sorted;


    switch (sortType) {
        case 'importance':
            sorted = sortByImportance(todos);
            break;
        case 'user':
            sorted = sortByUser(todos);
            break;
        case 'date':
            sorted = sortByDate(todos);
            break;
        default:
            console.log('Неверный тип сортировки');
            return;
    }

    for (let item of sorted) {
        console.log(item);
    }
    return;
}
