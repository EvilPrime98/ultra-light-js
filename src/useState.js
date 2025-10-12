export function useState(initialValue) {

    let value = initialValue;
    const subscribers = new Set();

    const setValue = (newValue) => {
        value = newValue;
        subscribers.forEach(fn => fn(value));
    };

    const subscribe = (fn) => subscribers.add(fn);

    return [
        () => value, 
        setValue, 
        subscribe
    ];
    
}