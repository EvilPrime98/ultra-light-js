export function useEffect(fn, subscriberArray) {

    const fnExecution = async () => {
        await fn();
    };

    fnExecution();

    subscriberArray.forEach( subscriber => subscriber(fn) );
    
}