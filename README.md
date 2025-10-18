# Ultra Light Framework

Un mini framework reactivo y ultra ligero para desarrollo web moderno, sin dependencias.

## ✨ Características

- 🚀 **State Management reactivo** - Sistema de estado simple y potente
- 🔀 **Router SPA** - Navegación client-side integrada con soporte para parámetros dinámicos
- 🎨 **Sistema de componentes** - Componentes reutilizables con ciclo de vida
- 💅 **Scoped CSS** - Estilos con scope automático para evitar conflictos
- 🎯 **Context API** - Compartir estado entre componentes
- 📦 **Sin dependencias** - Zero dependencies
- ⚡ **Ultra ligero** - Menos de 5KB minificado
- 🔧 **TypeScript** - Completamente tipado

## 📦 Instalación
```bash
npm install ultra-light-framework
```

## 🚀 Inicio rápido
```javascript
import { ultraState, UltraComponent, UltraRouter } from 'ultra-light-framework';

// State management
const [getCount, setCount, subscribe] = ultraState(0);

// Crear un componente
const Counter = UltraComponent({
  component: '<div><h1>Contador: <span id="count">0</span></h1><button id="btn">Incrementar</button></div>',
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

### `ultraState(initialValue)`

Crea un estado reactivo.
```javascript
const [getValue, setValue, subscribe] = ultraState(0);

// Obtener valor
console.log(getValue()); // 0

// Establecer valor
setValue(5);

// Suscribirse a cambios
const unsubscribe = subscribe((newValue) => {
  console.log('Nuevo valor:', newValue);
});

// Cancelar suscripción
unsubscribe();
```

### `UltraRouter(...routes)`

Crea un router para navegación SPA.
```javascript
import { UltraRouter, UltraLink } from 'ultra-light-framework';

const Home = () => '<div><h1>Home</h1></div>';
const About = () => '<div><h1>About</h1></div>';
const User = (params) => `<div><h1>Usuario: ${params.id}</h1></div>`;

const router = UltraRouter(
  { path: '/', component: Home },
  { path: '/about', component: About },
  { path: '/user/:id', component: User },
  { path: '/*', component: () => '<h1>404 Not Found</h1>' }
);

document.body.appendChild(router);
```

### `UltraLink({ href, child })`

Crea enlaces de navegación SPA.
```javascript
const link = UltraLink({
  href: '/about',
  child: '<span>Ir a About</span>'
});
```

### `UltraComponent(props)`

Crea componentes con eventos, estilos y ciclo de vida.
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

### `Activity(props)`

Muestra/oculta elementos basado en estado.
```javascript
const [isVisible, setVisible, subscribeVisible] = ultraState(true);

const ConditionalDiv = Activity({
  component: '<div>Solo visible cuando isVisible es true</div>',
  stateOn: isVisible,
  subscriber: subscribeVisible,
  invert: false // true para invertir la lógica
});
```

### `UltraContext(initialValue)`

Crea un contexto global para compartir estado.
```javascript
const ThemeContext = UltraContext('light');

// Proveer valor
ThemeContext.provide('dark');

// Obtener valor
console.log(ThemeContext.getValue()); // 'dark'

// Suscribirse
ThemeContext.subscribe((theme) => {
  console.log('Tema cambiado:', theme);
});
```

### `ultraStyles(cssString)`

Crea estilos con scope automático.
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

// Usar las clases con scope
const Component = `<div class="${styles.container}">
  <h1 class="${styles.title}">Título</h1>
</div>`;
```

### `ultraEffect(fn, subscriberArray)`

Ejecuta efectos secundarios cuando cambian estados.
```javascript
const [count, setCount, subscribeCount] = ultraState(0);
const [name, setName, subscribeName] = ultraState('John');

const cleanup = ultraEffect(() => {
  console.log(`${name()} tiene ${count()} puntos`);
}, [subscribeCount, subscribeName]);

// Limpiar efecto
cleanup();
```

### `ultraQueryParams()`

Obtiene parámetros de la URL.
```javascript
// URL: ?name=John&age=30
const params = ultraQueryParams();
console.log(params); // { name: 'John', age: '30' }
```

### `UltraFragment(...children)`

Agrupa múltiples elementos sin nodo contenedor.
```javascript
const fragment = UltraFragment(
  '<div>Elemento 1</div>',
  '<div>Elemento 2</div>',
  '<div>Elemento 3</div>'
);
```

## 🎯 Ejemplos

### Todo App completa
```javascript
import { ultraState, UltraComponent, ultraStyles } from 'ultra-light-framework';

const styles = ultraStyles(`
  .todo-app { max-width: 600px; margin: 0 auto; }
  .todo-item { padding: 10px; border: 1px solid #ddd; margin: 5px 0; }
`);

const [getTodos, setTodos, subscribeTodos] = ultraState([]);

const TodoApp = UltraComponent({
  component: `<div class="${styles['todo-app']}">
    <input id="todo-input" type="text" placeholder="Nueva tarea..." />
    <button id="add-btn">Agregar</button>
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

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor abre un issue o pull request en GitHub.

## 📄 Licencia

MIT

## 👤 Autor

Amín Pérez Alconchel

## 🔗 Enlaces

- [GitHub](https://github.com/EvilPrime98/ultra-light-js)
- [NPM](https://www.npmjs.com/package/ultra-light-framework)