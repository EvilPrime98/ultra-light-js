# Ultra Light Framework

An ultra-lightweight and reactive mini framework for modern web development, with zero dependencies.

## Features

- **Reactive State Management**
- **SPA Router**
- **Component System**
- **Scoped CSS**
- **Context API**
- **Zero dependencies**
- **Ultra lightweight** - Less than 5KB minified
- **TypeScript** - Fully typed

## Quick Start
```javascript
import { ultraState, UltraComponent } from 'ultra-light-js';

function Counter(){

  //create a state
  const [getCount, setCount, subscribe] = ultraState(0);

  //this function will execute when the state changes, and by default
  //it receives a reference to the trigger owner as the first argument.
  //this allows for granular DOM manipulation
  function onIncrement(
    $h1
  ){
    $h1.innerHTML = `Counter:${getCount()}`;
  }

  return UltraComponent({
    
    component: '<div></div>', //this is the root node. It accepts children in plain HTML
    
    children: [
      
      UltraComponent({
        component: `<h1>Counter:${getCount()}</h1>`,
        trigger: [ //this is where the magic happens! when the subscriber state changes, the trigger function is executed
          { subscriber: subscribe, triggerFunction: onIncrement}
        ]
      }),

      UltraComponent({
        component: '<button>Increment</button>',
        eventHandler: { click: () => setCount(getCount() + 1) }
      }) 

    ]

  });

}

```

## Development

This is a work in progress. The API will change frequently. Contributions are welcome! Please open an issue or PR.

## API

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

### ultraCompState(initialComp)

Creates a composite stateful object. Each key becomes a reactive state with `get`, `set`, and `subscribe`. Functions receive the composite state object as the first argument, allowing methods to access other state values.

```javascript
const store = ultraCompState({
  count: 0,
  name: 'John',
  // functions become methods on the store
  increment: (state) => state.count.set(state.count.get() + 1),
  reset: (state) => {
    state.count.set(0);
    state.name.set('John');
  }
});

// Access state
store.count.get();       // 0
store.count.set(5);
store.count.subscribe((v) => console.log(v));

// Call methods
store.increment();
store.reset();
```

### UltraContext(initialValue, displayName?)

Creates a scoped context that can be owned by a specific DOM node. All methods require the calling node as the first argument. If the node is not a descendant of the owner, the operation is blocked.

```javascript
const ThemeContext = UltraContext('light', 'ThemeContext');

// Assign an owner node (can only be set once)
ThemeContext.own(myRootNode);

// Set value (requires caller node to be inside owner)
ThemeContext.set(myNode, 'dark');

// Get value
console.log(ThemeContext.get(myNode)); // 'dark'

// Subscribe
const unsub = ThemeContext.subscribe(myNode, (theme) => {
  console.log('Theme changed:', theme);
});
unsub(); // unsubscribe
```

### ultraStyles(cssString)

Creates automatically scoped styles. Returns a map of original class names to hashed class names.
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

### ultraQueryParams()

Gets URL search parameters as a plain object.
```javascript
// URL: ?name=John&age=30
const params = ultraQueryParams();
console.log(params); // { name: 'John', age: '30' }
```

### UltraRouter(...routes)

Creates a router for SPA navigation.
```javascript
import { UltraRouter, UltraLink } from 'ultra-light-js';

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

Creates SPA navigation links. Ctrl/Meta+click opens in a new tab normally.
```javascript
const link = UltraLink({
  href: '/about',
  child: '<span>Go to About</span>'
});
```

### UltraComponent(props)

Creates a component with event handlers, styles, class names, children, reactive triggers, lifecycle hooks, and cleanup.

```javascript
const Button = UltraComponent({
  component: '<button>Click me</button>',

  // Event handlers - object with event names as keys
  eventHandler: {
    click: () => alert('Clicked!'),
    mouseenter: () => console.log('hovered')
  },

  // Inline styles
  styles: {
    backgroundColor: 'blue',
    color: 'white'
  },

  // CSS class names to add
  className: ['btn', 'btn-primary'],

  // Child elements (strings, HTMLElements, or null for conditional rendering)
  children: ['<span>Icon</span>', null],

  // Reactive triggers - run when state changes
  trigger: [{
    subscriber: subscribe,
    triggerFunction: (node) => {
      node.querySelector('#count').textContent = getCount();
    },
    defer: false // set true to defer to next animation frame
  }],

  // Called immediately after mount (next animation frame)
  onMount: [(node) => node.focus()],

  // Cleanup functions called on component teardown
  cleanup: [() => clearInterval(myInterval)]
});
```

### UltraActivity(props)

Shows or hides an element based on state. Shares the same props as `UltraComponent`, plus `mode` and `type`.

```javascript
const [isVisible, setVisible, subscribeVisible] = ultraState(true);

const ConditionalDiv = UltraActivity({
  component: '<div>Only visible when isVisible is true</div>',

  // mode controls visibility
  mode: {
    state: isVisible,               // getter function returning boolean
    subscriber: subscribeVisible    // or an array of subscribers
  },

  // 'display' (default) toggles display:none | ''
  // 'visibility' toggles visibility:hidden | visible
  type: 'display'
});
```

### UltraFragment(...children)

Groups multiple elements into a `DocumentFragment` without a wrapper node. Accepts `null` values for conditional rendering.
```javascript
const fragment = UltraFragment(
  '<div>Element 1</div>',
  someCondition ? '<div>Element 2</div>' : null,
  '<div>Element 3</div>'
);
```

## Examples

### Complete Todo App
```javascript
import { ultraState, UltraComponent, ultraStyles } from 'ultra-light-js';

const styles = ultraStyles(`

  .todo-app {
    max-width: 600px;
    margin: 0 auto;
  }

  .todo-item {
    padding: 10px;
    border: 1px solid #ddd;
    margin: 5px 0;
  }

`);

function TodoApp(){

  const [getTodos, setTodos, subscribeTodos] = ultraState([]);
  const [getInput, setInput, subscribeInput] = ultraState('');

  function onListChange($list){
    $list.innerHTML = getTodos()
      .map(todo => `<div class="${styles['todo-item']}">${todo.text}</div>`)
      .join('');
  }

  function onInputChange($input){
    $input.value = getInput();
  }

  return UltraComponent({
    
    component: '<div></div>',

    className: [styles['todo-app']],
    
    children: [

      UltraComponent({
        component: '<input type="text" placeholder="New task..." />',
        eventHandler: { input: (e) => setInput(e.target.value) },
        trigger: [{ subscriber: subscribeInput, triggerFunction: onInputChange }]
      }),

      UltraComponent({
        component: '<button>Add</button>',
        eventHandler: {
          click: () => {
            if (getInput().trim()) {
              setTodos([...getTodos(), { id: Date.now(), text: getInput() }]);
              setInput('');
            }
          }
        }
      }),

      UltraComponent({
        component: '<div></div>',
        trigger: [{ subscriber: subscribeTodos, triggerFunction: onListChange }]
      })

    ]
  });

}

document.body.appendChild(
  TodoApp()
);
```


## License

GPL-3.0

## Author

Amin Perez Alconchel
