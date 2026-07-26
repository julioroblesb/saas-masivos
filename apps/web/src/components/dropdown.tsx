'use client';

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react';
import { usePopper } from 'react-popper';
import type { Placement } from '@popperjs/core';

export interface DropdownHandle {
  close: () => void;
}

interface DropdownProps {
  btnClassName?: string;
  button: ReactNode;
  children: ReactNode;
  offset?: [number, number];
  placement?: Placement;
}

const Dropdown = forwardRef<DropdownHandle, DropdownProps>(function Dropdown(
  { btnClassName, button, children, offset = [0, 0], placement = 'bottom-end' },
  forwardedRef,
) {
  const [visible, setVisible] = useState(false);
  const [referenceElement, setReferenceElement] = useState<HTMLButtonElement | null>(null);
  const [popperElement, setPopperElement] = useState<HTMLDivElement | null>(null);
  const { styles, attributes } = usePopper(referenceElement, popperElement, {
    placement,
    modifiers: [{ name: 'offset', options: { offset } }],
  });

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      if (
        event.target instanceof Node &&
        (referenceElement?.contains(event.target) || popperElement?.contains(event.target))
      ) {
        return;
      }
      setVisible(false);
    };
    document.addEventListener('mousedown', handleDocumentClick);
    return () => document.removeEventListener('mousedown', handleDocumentClick);
  }, [popperElement, referenceElement]);

  useImperativeHandle(forwardedRef, () => ({ close: () => setVisible(false) }), []);

  const closeAfterSelection = (event: ReactMouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('a,button,[role="menuitem"]')) setVisible(false);
  };

  return (
    <>
      <button
        ref={setReferenceElement}
        type="button"
        className={btnClassName}
        onClick={() => setVisible((current) => !current)}
        aria-expanded={visible}
        aria-haspopup="menu"
      >
        {button}
      </button>
      {visible && (
        <div
          ref={setPopperElement}
          style={styles.popper}
          {...attributes.popper}
          className="z-50"
          onClick={closeAfterSelection}
          role="menu"
        >
          {children}
        </div>
      )}
    </>
  );
});

export default Dropdown;
