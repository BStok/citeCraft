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
    background: '#eaefef',
    border: '1.5px solid #525158',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  };

  const pupilStyle: React.CSSProperties = {
    width: pupilSize,
    height: pupilSize,
    background: '#43092b',
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
    <div className="flex flex-col items-center" style={{ filter: 'drop-shadow(0 2px 8px rgba(180,60,90,0.18))' }}>
      <div className="flex gap-2 items-center">
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
      <svg width={size * 1.5} height={size * 0.3} viewBox="0 0 40 16">
        <path
          d="M 6 4 Q 20 16 34 4"
          stroke="#4e0505"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    </div>
  );

}