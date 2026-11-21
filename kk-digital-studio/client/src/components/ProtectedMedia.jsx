export default function ProtectedMedia({ children, className = '' }) {
  const preventContextMenu = (event) => event.preventDefault();
  const preventMediaDrag = (event) => {
    if (event.target.closest('img, video')) event.preventDefault();
  };

  return (
    <div
      className={`media-protected ${className}`}
      data-protected-media
      onContextMenu={preventContextMenu}
      onDragStart={preventMediaDrag}
    >
      {children}
    </div>
  );
}
