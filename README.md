# Ultra Light Framework

An ultra-lightweight and reactive mini framework for modern web development, with zero dependencies.

## ✨ Features

- 🚀 **Reactive State Management** - Simple and powerful state system
- 🔀 **SPA Router** - Built-in client-side navigation with dynamic parameter support
- 🎨 **Component System** - Reusable components with lifecycle
- 💅 **Scoped CSS** - Automatic scoped styles to avoid conflicts
- 🎯 **Context API** - Share state between components
- 📦 **Zero dependencies** - No dependencies required
- ⚡ **Ultra lightweight** - Less than 5KB minified
- 🔧 **TypeScript** - Fully typed

## 📦 Installation
```bash
npm install ultra-light-framework
```

## 🚀 Quick Start
```javascript
import { ultraState, UltraComponent, UltraRouter } from 'ultra-light-framework';

// State management
const [getCount, setCount, subscribe] = ultraState(0);

// Create a component
const Counter = UltraComponent({
  component: '<div><h1>Counter: <span id="count">0</span></h1><button id="btn">Increment</button></div>',
  eventHandlers: [{
    eventType: 'click',
    eventCallback: (e) => {
      if (e.target.id === 'btn') {
        setCount(getCount() + 1);
      }
    }
  }],
  trigger: [{
    subscriber: subscribe,
    subscriberFunction: (node) => {
      node.querySelector('#count').textContent = getCount();
    }
  }]
});

document.body.appendChild(Counter);
```

## 📖 API

### ultraState(initialValue)

Creates a reactive state.
```javascript
const [getValue, setValue, subscribe] = ultraState(0);

// Get value
console.log(getValue()); // 0

// Set value
setValue(5);

// Subscribe to changes
const unsubscribe = subscribe((newValue) => {
  console.log('New value:', newValue);
});

// Unsubscribe
unsubscribe();
```

### UltraRouter(...routes)

Creates a router for SPA navigation.
```javascript
import { UltraRouter, UltraLink } from 'ultra-light-framework';

const Home = () => '<div><h1>Home</h1></div>';
const About = () => '<div><h1>About</h1></div>';
const User = (params) => `<div><h1>User: ${params.id}</h1></div>`;

const router = UltraRouter(
  { path: '/', component: Home },
  { path: '/about', component: About },
  { path: '/user/:id', component: User },
  { path: '/*', component: () => '<h1>404 Not Found</h1>' }
);

document.body.appendChild(router);
```

### UltraLink({ href, child })

Creates SPA navigation links.
```javascript
const link = UltraLink({
  href: '/about',
  child: '<span>Go to About</span>'
});
```

### UltraComponent(props)

Creates components with events, styles, and lifecycle.
```javascript
const Button = UltraComponent({
  component: '<button class="btn">Click me</button>',
  eventHandlers: [{
    eventType: 'click',
    eventCallback: () => alert('Clicked!')
  }],
  styles: {
    backgroundColor: 'blue',
    color: 'white'
  },
  children: ['<span>Icon</span>']
});
```

### Activity(props)

Shows/hides elements based on state.
```javascript
const [isVisible, setVisible, subscribeVisible] = ultraState(true);

const ConditionalDiv = Activity({
  component: '<div>Only visible when isVisible is true</div>',
  stateOn: isVisible,
  subscriber: subscribeVisible,
  invert: false // true to invert the logic
});
```

### UltraContext(initialValue)

Creates a global context to share state.
```javascript
const ThemeContext = UltraContext('light');

// Provide value
ThemeContext.provide('dark');

// Get value
console.log(ThemeContext.getValue()); // 'dark'

// Subscribe
ThemeContext.subscribe((theme) => {
  console.log('Theme changed:', theme);
});
```

### ultraStyles(cssString)

Creates automatically scoped styles.
```javascript
const styles = ultraStyles(`
  .container {
    padding: 20px;
    background: white;
  }
  .title {
    color: blue;
    font-size: 24px;
  }
`);

// Use scoped classes
const Component = `<div class="${styles.container}">
  <h1 class="${styles.title}">Title</h1>
</div>`;
```

### ultraEffect(fn, subscriberArray)

Executes side effects when states change.
```javascript
const [count, setCount, subscribeCount] = ultraState(0);
const [name, setName, subscribeName] = ultraState('John');

const cleanup = ultraEffect(() => {
  console.log(`${name()} has ${count()} points`);
}, [subscribeCount, subscribeName]);

// Clean up effect
cleanup();
```

### ultraQueryParams()

Gets URL parameters.
```javascript
// URL: ?name=John&age=30
const params = ultraQueryParams();
console.log(params); // { name: 'John', age: '30' }
```

### UltraFragment(...children)

Groups multiple elements without a container node.
```javascript
const fragment = UltraFragment(
  '<div>Element 1</div>',
  '<div>Element 2</div>',
  '<div>Element 3</div>'
);
```

## 🎯 Examples

### Complete Todo App
```javascript
import { ultraState, UltraComponent, ultraStyles } from 'ultra-light-framework';

const styles = ultraStyles(`
  .todo-app { max-width: 600px; margin: 0 auto; }
  .todo-item { padding: 10px; border: 1px solid #ddd; margin: 5px 0; }
`);

const [getTodos, setTodos, subscribeTodos] = ultraState([]);

const TodoApp = UltraComponent({
  component: `<div class="${styles['todo-app']}">
    <input id="todo-input" type="text" placeholder="New task..." />
    <button id="add-btn">Add</button>
    <div id="todo-list"></div>
  </div>`,
  eventHandlers: [{
    eventType: 'click',
    eventCallback: (e) => {
      if (e.target.id === 'add-btn') {
        const input = document.getElementById('todo-input');
        if (input.value.trim()) {
          setTodos([...getTodos(), { id: Date.now(), text: input.value }]);
          input.value = '';
        }
      }
    }
  }],
  trigger: [{
    subscriber: subscribeTodos,
    subscriberFunction: (node) => {
      const list = node.querySelector('#todo-list');
      list.innerHTML = getTodos()
        .map(todo => `<div class="${styles['todo-item']}">${todo.text}</div>`)
        .join('');
    }
  }]
});

document.body.appendChild(TodoApp);
```

## 🤝 Contributing

Contributions are welcome! Please open an issue or pull request on GitHub.

## 📄 License

MIT

## 👤 Author

Amín Pérez Alconchel

## 🔗 Links

- [GitHub](https://github.com/EvilPrime98/ultra-light-js)
- [NPM](https://www.npmjs.com/package/ultra-light-framework)