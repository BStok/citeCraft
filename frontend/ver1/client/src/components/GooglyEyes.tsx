import { useEffect, useRef } from 'react';

interface GooglyEyesProps {
  size?: number;
}

export function GooglyEyes({ size = 36 }: GooglyEyesProps) {
  const leftEyeRef = useRef<HTMLDivElement>(null);
  const rightEyeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const moveEye = (eye: HTMLDivElement | null) => {
        if (!eye) return;
        const rect = eye.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const angle = Math.atan2(e.clientY - cy, e.clientX - cx);
        const x = Math.cos(angle) * 6;
        const y = Math.sin(angle) * 6;
        const pupil = eye.querySelector('.pupil') as HTMLDivElement;
        if (pupil) pupil.style.transform = `translate(${x}px, ${y}px)`;
      };
      moveEye(leftEyeRef.current);
      moveEye(rightEyeRef.current);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const pupilSize = Math.round(size * 0.39);

  const eyeStyle: React.CSSProperties = {
    width: size,
    height: size,
    background: '#F3F4F6',
    border: '1px solid #E5E7EB',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  };

  const pupilStyle: React.CSSProperties = {
    width: pupilSize,
    height: pupilSize,
    background: '#111111',
    borderRadius: '50%',
    transition: 'transform 75ms ease-out',
    position: 'relative',
  };

  const highlightStyle: React.CSSProperties = {
    position: 'absolute',
    width: Math.round(size * 0.14),
    height: Math.round(size * 0.14),
    background: '#FFFFFF',
    opacity: 0.8,
    top: 1,
    right: 1,
    borderRadius: '50%',
    pointerEvents: 'none',
  };

  return (
    <div className="flex gap-2 items-center" style={{ filter: 'drop-shadow(0 2px 8px rgba(180,60,90,0.18))' }}>
      <div ref={leftEyeRef} style={eyeStyle}>
        <div className="pupil" style={pupilStyle}>
          <div style={highlightStyle} />
        </div>
      </div>
      <div ref={rightEyeRef} style={eyeStyle}>
        <div className="pupil" style={pupilStyle}>
          <div style={highlightStyle} />
        </div>
      </div>
    </div>
  );
}