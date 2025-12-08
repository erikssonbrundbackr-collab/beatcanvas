import { HTMLAttributes } from 'react'
export default function Badge({ className='', ...rest }: HTMLAttributes<HTMLSpanElement>) {
  return <span {...rest} className={`badge ${className}`} />
}