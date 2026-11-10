"use client";

import { useEffect, useRef, useState, type CSSProperties, type ElementType, type HTMLAttributes, type ReactNode } from "react";

type Variant = "pop" | "sube" | "capa";

type RevealProps = Omit<HTMLAttributes<HTMLElement>, "className" | "style" | "children"> & {
  /** Etiqueta que se dibuja (div, li, section, article…). */
  as?: ElementType;
  /** pop: crece con un rebote; sube: se desliza hacia arriba; capa: se asienta como papel recortado. */
  variant?: Variant;
  /** Escalón de la entrada escalonada (cada uno suma 85 ms). */
  delay?: number;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
};

/**
 * Aparición al hacer scroll. El elemento se ve por defecto; solo se oculta cuando el script de la cabecera activó el
 * modo (<html data-reveal="on">). React marca `is-visible` después de hidratar, cuando el elemento entra en
 * pantalla, así el HTML del servidor y el del cliente coinciden.
 */
export function Reveal({ as, variant = "pop", delay = 0, className = "", style, children, ...rest }: RevealProps) {
  const Tag = (as ?? "div") as ElementType;
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (document.documentElement.dataset.reveal !== "on") {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setVisible(true);
        io.disconnect();
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      data-reveal={variant}
      className={visible ? `${className} is-visible` : className}
      style={delay ? { ...style, ["--d" as string]: delay } : style}
      {...rest}
    >
      {children}
    </Tag>
  );
}
