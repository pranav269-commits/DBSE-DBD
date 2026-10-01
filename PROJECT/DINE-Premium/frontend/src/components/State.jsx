export function Loading({label='Loading DINE…'}){return <div className="state"><div className="spinner"/><p>{label}</p></div>}
export function ErrorState({message}){return <div className="state error"><h3>Something needs attention</h3><p>{message}</p></div>}
export function Empty({message='Nothing here yet.'}){return <div className="state"><p>{message}</p></div>}
