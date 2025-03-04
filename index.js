const { getAllFilePathsWithExtension, readFile } = require('./fileSystem');
const { readLine } = require('./console');
const path = require('path');

let todos = [];

console.log('Please, write your command!');
readLine(processCommand);

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
        const aMarks = countExclamationMarks(a.text);
        const bMarks = countExclamationMarks(b.text);
        return bMarks - aMarks;
    });
}

function sortByUser(todos) {
    const userGroups = new Map();
    const noUser = [];

    todos.forEach(todo => {
        const username = getUsername(todo.text).toLowerCase();
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
        result.push(...userTodos);
    }

    if (noUser.length > 0) {
        result.push(...noUser);
    }

    return result;
}

function sortByDate(todos) {
    const withDate = [];
    const withoutDate = [];

    todos.forEach(todo => {
        const date = parseDate(todo.text);
        if (date) {
            withDate.push({ todo, date });
        } else {
            withoutDate.push(todo);
        }
    });

    withDate.sort((a, b) => b.date - a.date);
    return [...withDate.map(item => item.todo), ...withoutDate];
}

function truncate(str, maxLength) {
    if (str.length <= maxLength) return str;
    return str.slice(0, maxLength - 3) + '...';
}

function getColumnData(todos) {
    const columns = {
        importance: { maxWidth: 1, values: [] },
        username: { maxWidth: 10, values: [] },
        date: { maxWidth: 10, values: [] },
        file: { maxWidth: 15, values: [] },
        comment: { maxWidth: 50, values: [] }
    };

    const headers = ['!', 'user', 'date', 'file', 'comment'];
    
    todos.forEach(todo => {
        const hasExclamation = todo.text.includes('!') ? '!' : '';
        const username = getUsername(todo.text) || '';
        const date = parseDate(todo.text);
        const dateStr = date ? date.toISOString().slice(0, 10) : '';
        const fileName = path.basename(todo.file);
        const parts = todo.text.split(';');
        const comment = parts.length >= 3 ? parts[2].trim() : todo.text;

        columns.importance.values.push(hasExclamation);
        columns.username.values.push(username);
        columns.date.values.push(dateStr);
        columns.file.values.push(fileName);
        columns.comment.values.push(comment);
    });

    // Вычисляем оптимальную ширину для каждой колонки с учетом заголовков
    const colKeys = Object.keys(columns);
    for (let i = 0; i < colKeys.length; i++) {
        const col = columns[colKeys[i]];
        col.width = Math.min(
            col.maxWidth,
            Math.max(headers[i].length, ...col.values.map(v => v.length))
        );
    }

    return columns;
}

function formatTableRow(columns, values) {
    const cells = [
        values[0].padEnd(columns.importance.width),
        truncate(values[1], columns.username.width).padEnd(columns.username.width),
        values[2].padEnd(columns.date.width),
        truncate(values[3], columns.file.width).padEnd(columns.file.width),
        truncate(values[4], columns.comment.width)
    ];
    
    return cells.join('  |  ');
}

function getTableSeparator(columns) {
    const totalWidth = Object.values(columns).reduce((sum, col) => sum + col.width, 0) + 16; // 16 для разделителей (4 разделителя по 4 символа)
    return '-'.repeat(totalWidth);
}

function displayTodos(todos) {
    if (!todos.length) {
        console.log('Нет TODO комментариев');
        return;
    }
    
    const columns = getColumnData(todos);
    
    console.log(formatTableRow(columns, ['!', 'user', 'date', 'file', 'comment']));
    console.log(getTableSeparator(columns));
    
    for (let i = 0; i < todos.length; i++) {
        console.log(formatTableRow(columns, [
            columns.importance.values[i],
            columns.username.values[i],
            columns.date.values[i],
            columns.file.values[i],
            columns.comment.values[i]
        ]));
    }

    console.log(getTableSeparator(columns));
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
            displayTodos(todos);
            break;
        case 'important':
            todos = parseTodo();
            const importantTodos = todos.filter(todo => todo.text.includes('!'));
            displayTodos(importantTodos);
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
        const todoDate = parseDate(todo.text);
        return todoDate && todoDate >= targetDate;
    });

    displayTodos(filteredTodos);
}

function parseTodo() {
    const comments = [];
    const filePaths = getAllFilePathsWithExtension(process.cwd(), 'js');
    
    for (const filePath of filePaths) {
        const fileContent = readFile(filePath);
        const lines = fileContent.split('\r\n');
        for (const line of lines) {
            const todoIndex = line.indexOf('// TODO');
            if (todoIndex !== -1 && !line.includes('\'// TODO')) {
                const todoText = line.slice(todoIndex + 7).trim();
                comments.push({ text: todoText, file: filePath });
            }
        }
    }
    return comments;
}

function getUserData(command) {
    const username = command.slice(5);
    todos = parseTodo();
    const userTodos = todos.filter(todo => getUsername(todo.text).toLowerCase() === username.toLowerCase());
    displayTodos(userTodos);
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

    displayTodos(sorted);
}
