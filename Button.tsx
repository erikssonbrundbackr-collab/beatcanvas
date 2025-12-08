import { ButtonHTMLAttributes } from 'react'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'outline' | 'ghost' | 'primary'
  size?: 'sm' | 'md' | 'icon'
}

export default function Button({ variant='default', size='md', className='', ...rest }: Props) {
  const cn = ['btn', variant==='outline'?'':'', variant==='ghost'?'ghost':'', variant==='primary'?'primary':'', className].join(' ')
  return <button {...rest} className={cn} />
}