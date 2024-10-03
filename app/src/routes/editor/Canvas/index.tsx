import { useEditorEngine } from '@/components/Context';
import { EditorMode } from '@/lib/models';
import { observer } from 'mobx-react-lite';
import { ReactNode, useEffect, useRef, useState } from 'react';
import HotkeysArea from './HotkeysArea';
import PanOverlay from './PanOverlay';

const Canvas = observer(({ children }: { children: ReactNode }) => {
    const ZOOM_SENSITIVITY = 0.006;
    const PAN_SENSITIVITY = 0.52;
    const MIN_ZOOM = 0.1;
    const MAX_ZOOM = 3;
    const MAX_X = 1000;
    const MAX_Y = 1000;
    const MIN_X = -500;
    const MIN_Y = -500;

    const editorEngine = useEditorEngine();
    const containerRef = useRef<HTMLDivElement>(null);
    const [isPanning, setIsPanning] = useState(false);
    const [scale, setScale] = useState(editorEngine.canvas.scale);
    const [position, setPosition] = useState(editorEngine.canvas.position);

    useEffect(() => {
        editorEngine.canvas.scale = scale;
        editorEngine.canvas.position = position;
    }, [position, scale]);

    const handleWheel = (event: WheelEvent) => {
        if (event.ctrlKey || event.metaKey) {
            handleZoom(event);
        } else {
            handlePan(event);
        }
    };

    const handleZoom = (event: WheelEvent) => {
        if (!containerRef.current) {
            return;
        }
        event.preventDefault();
        const zoomFactor = -event.deltaY * ZOOM_SENSITIVITY;
        const rect = containerRef.current.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        const newScale = scale * (1 + zoomFactor);
        const lintedScale = clampZoom(newScale);

        const deltaX = (x - position.x) * zoomFactor;
        const deltaY = (y - position.y) * zoomFactor;

        setScale(lintedScale);

        if (newScale < MIN_ZOOM || newScale > MAX_ZOOM) {
            return;
        }
        setPosition((prevPosition) =>
            clampPosition({
                x: prevPosition.x - deltaX,
                y: prevPosition.y - deltaY,
            }),
        );
    };

    function clampZoom(scale: number) {
        return Math.min(Math.max(scale, MIN_ZOOM), MAX_ZOOM);
    }

    function clampPosition(position: { x: number; y: number }) {
        console.log(position);
        return {
            x: Math.min(Math.max(position.x, MIN_X), MAX_X),
            y: Math.min(Math.max(position.y, MIN_Y), MAX_Y),
        };
    }

    const handlePan = (event: WheelEvent) => {
        const deltaX = (event.deltaX + (event.shiftKey ? event.deltaY : 0)) * PAN_SENSITIVITY;
        const deltaY = (event.shiftKey ? 0 : event.deltaY) * PAN_SENSITIVITY;
        setPosition((prevPosition) =>
            clampPosition({
                x: prevPosition.x - deltaX,
                y: prevPosition.y - deltaY,
            }),
        );
    };

    const handleCanvasClicked = (event: React.MouseEvent<HTMLDivElement>) => {
        if (event.target !== containerRef.current) {
            return;
        }
        editorEngine.webviews.deselectAll();
        editorEngine.webviews.notify();
        editorEngine.clear();
    };

    useEffect(() => {
        const div = containerRef.current;
        if (div) {
            div.addEventListener('wheel', handleWheel, { passive: false });
            div.addEventListener('mousedown', middleMouseButtonDown);
            div.addEventListener('mouseup', middleMouseButtonUp);
            return () => {
                div.removeEventListener('wheel', handleWheel);
                div.removeEventListener('mousedown', middleMouseButtonDown);
                div.removeEventListener('mouseup', middleMouseButtonUp);
            };
        }
    }, [handleWheel]);

    const middleMouseButtonDown = (e: MouseEvent) => {
        if (e.button === 1) {
            editorEngine.mode = EditorMode.PAN;
            setIsPanning(true);
            e.preventDefault();
            e.stopPropagation();
        }
    };

    const middleMouseButtonUp = (e: MouseEvent) => {
        if (e.button === 1) {
            editorEngine.mode = EditorMode.DESIGN;
            setIsPanning(false);
            e.preventDefault();
            e.stopPropagation();
        }
    };

    return (
        <HotkeysArea scale={scale} setScale={setScale}>
            <div
                ref={containerRef}
                className="overflow-hidden bg-bg flex flex-grow relative"
                onClick={handleCanvasClicked}
            >
                <div
                    style={{
                        transition: 'transform ease',
                        transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                        transformOrigin: '0 0',
                    }}
                >
                    {children}
                </div>
                <PanOverlay
                    setPosition={setPosition}
                    clampPosition={clampPosition}
                    isPanning={isPanning}
                    setIsPanning={setIsPanning}
                />
            </div>
        </HotkeysArea>
    );
});

export default Canvas;
