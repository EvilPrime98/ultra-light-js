export function Link( {
    href,
    child
}) {

    const link = document.createElement('a');

    link.href = href;
    
    link.addEventListener('click', (e) => {
        e.preventDefault();
        window.history.pushState({}, '', href);
        window.dispatchEvent(new PopStateEvent('popstate'));
    });
    

    if (typeof child === 'string') {
        link.appendChild(document.createTextNode(child));
    } else {
        link.appendChild(child);
    }

    return link;
    
}