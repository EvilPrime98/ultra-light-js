import { useEffect } from './useEffect.js';

export function BrowserRouter(...routes) {

    const container = document.createElement('div');
    container.classList.add('browser-router');
    
    const renderRoute = () => {

        const currentPath = window.location.pathname;
        
        let targetComponent;
        
        routes.forEach(route => {
            if (route.path === currentPath) {
                targetComponent = route.component();
            } else if (route.path === '/*' && !targetComponent) {
                targetComponent = route.component();
            }
        });

        container.innerHTML = '';

        if (targetComponent) container.appendChild(targetComponent);

    };
    
    renderRoute();

    useEffect(() => {
        window.addEventListener('popstate', renderRoute);
    }, []);
    
    return container;

}