import { useEffect, useRef } from 'react';
import { subscribeGestorEventos } from '../api';

export function useGestorSSE(festivalId: number, onEvent: (type: string) => void) {
    const cbRef = useRef(onEvent);
    cbRef.current = onEvent;
    useEffect(() => {
        return subscribeGestorEventos(festivalId, (type) => cbRef.current(type));
    }, [festivalId]);
}
