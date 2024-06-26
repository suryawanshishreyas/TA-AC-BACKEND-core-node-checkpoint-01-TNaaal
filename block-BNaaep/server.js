const http = require('http');
const fs = require('fs');
const path = require('path');
const { parse } = require('querystring');

// Define the port
const PORT = 5000;

// Helper function to read HTML templates
const readHTML = (filePath, res) => {
    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Internal Server Error');
        } else {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(data);
        }
    });
};

// Helper function to send JSON responses
const sendResponse = (res, statusCode, data) => {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
};

// Create the server
const server = http.createServer((req, res) => {
    if (req.method === 'GET') {
        if (req.url === '/') {
            readHTML(path.join(__dirname, 'templates', 'index.html'), res);
        } else if (req.url === '/about') {
            readHTML(path.join(__dirname, 'templates', 'about.html'), res);
        } else if (req.url === '/contact') {
            readHTML(path.join(__dirname, 'templates', 'contact.html'), res);
        } else if (req.url.startsWith('/assets')) {
            const assetPath = path.join(__dirname, req.url);
            fs.readFile(assetPath, (err, data) => {
                if (err) {
                    res.writeHead(404, { 'Content-Type': 'text/plain' });
                    res.end('Asset not found');
                } else {
                    const ext = path.extname(assetPath);
                    const mimeTypes = {
                        '.html': 'text/html',
                        '.css': 'text/css',
                        '.png': 'image/png',
                        '.jpg': 'image/jpeg',
                    };
                    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'text/plain' });
                    res.end(data);
                }
            });
        } else if (req.url.startsWith('/users')) {
            const username = new URL(req.url, `http://${req.headers.host}`).searchParams.get('username');
            if (username) {
                // Fetch specific user data
                const filePath = path.join(__dirname, 'contacts', `${username}.json`);
                fs.readFile(filePath, (err, data) => {
                    if (err) {
                        if (err.code === 'ENOENT') {
                            return sendResponse(res, 404, { message: 'User not found' });
                        }
                        return sendResponse(res, 500, { message: 'Internal Server Error' });
                    }
                    const userData = JSON.parse(data);
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(`
                        <html>
                        <head><title>User Data</title></head>
                        <body>
                            <h1>User Data</h1>
                            <p>Name: ${userData.name}</p>
                            <p>Email: ${userData.email}</p>
                            <p>Username: ${userData.username}</p>
                            <p>Age: ${userData.age}</p>
                            <p>Bio: ${userData.bio}</p>
                        </body>
                        </html>
                    `);
                });
            } else {
                // List all users
                const usersDir = path.join(__dirname, 'contacts');
                fs.readdir(usersDir, (err, files) => {
                    if (err) {
                        return sendResponse(res, 500, { message: 'Internal Server Error' });
                    }
                    const users = files.map(file => file.replace('.json', ''));
                    const userListHTML = users.map(user => `<li>${user}</li>`).join('');
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(`
                        <html>
                        <head><title>User List</title></head>
                        <body>
                            <h1>User List</h1>
                            <ul>${userListHTML}</ul>
                        </body>
                        </html>
                    `);
                });
            }
        } else {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Page not found');
        }
    } else if (req.method === 'POST' && req.url === '/form') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            const user = parse(body);
            const filePath = path.join(__dirname, 'contacts', `${user.username}.json`);

            fs.open(filePath, 'wx', (err, fd) => {
                if (err) {
                    if (err.code === 'EEXIST') {
                        return sendResponse(res, 409, { message: 'Username taken' });
                    }
                    return sendResponse(res, 500, { message: 'Internal Server Error' });
                }

                fs.writeFile(fd, JSON.stringify(user), err => {
                    if (err) {
                        return sendResponse(res, 500, { message: 'Internal Server Error' });
                    }

                    fs.close(fd, err => {
                        if (err) {
                            return sendResponse(res, 500, { message: 'Internal Server Error' });
                        }

                        res.writeHead(201, { 'Content-Type': 'text/html' });
                        res.end(`
                            <html>
                            <head><title>Contact Saved</title></head>
                            <body>
                                <h1>Contact Saved</h1>
                                <p>Name: ${user.name}</p>
                                <p>Email: ${user.email}</p>
                                <p>Username: ${user.username}</p>
                                <p>Age: ${user.age}</p>
                                <p>Bio: ${user.bio}</p>
                            </body>
                            </html>
                        `);
                    });
                });
            });
        });
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Page not found');
    }
});

// Start the server and listen on the specified port
server.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});
