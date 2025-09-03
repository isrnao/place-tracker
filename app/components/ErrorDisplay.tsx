import { AlertCircle, RefreshCw, X } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';

export interface ErrorDisplayProps {
  title?: string;
  message: string;
  action?: string;
  canRetry?: boolean;
  onRetry?: () => void;
  onDismiss?: () => void;
  variant?: 'inline' | 'card' | 'toast';
  className?: string;
}

export function ErrorDisplay({
  title = 'エラー',
  message,
  action,
  canRetry = false,
  onRetry,
  onDismiss,
  variant = 'inline',
  className = '',
}: ErrorDisplayProps) {
  const content = (
    <div className={`flex items-start gap-3 ${className}`}>
      <AlertCircle className='mt-0.5 h-5 w-5 flex-shrink-0 text-red-500' />
      <div className='min-w-0 flex-1'>
        <h4 className='mb-1 text-sm font-medium text-red-800'>{title}</h4>
        <p className='mb-2 text-sm text-red-700'>{message}</p>
        {action && <p className='mb-3 text-xs text-red-600'>{action}</p>}
        <div className='flex items-center gap-2'>
          {canRetry && onRetry && (
            <Button
              variant='outline'
              size='sm'
              onClick={onRetry}
              className='h-8 border-red-300 px-3 text-xs text-red-700 hover:bg-red-50'
            >
              <RefreshCw className='mr-1 h-3 w-3' />
              再試行
            </Button>
          )}
          {onDismiss && (
            <Button
              variant='ghost'
              size='sm'
              onClick={onDismiss}
              className='h-8 px-3 text-xs text-red-600 hover:bg-red-50'
            >
              <X className='mr-1 h-3 w-3' />
              閉じる
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  if (variant === 'card') {
    return (
      <Card className='border-red-200 bg-red-50'>
        <CardContent className='p-4'>{content}</CardContent>
      </Card>
    );
  }

  if (variant === 'toast') {
    return (
      <div className='rounded-lg border border-red-200 bg-red-50 p-4 shadow-lg'>
        {content}
      </div>
    );
  }

  return (
    <div className='rounded-md border border-red-200 bg-red-50 p-4'>
      {content}
    </div>
  );
}

/**
 * フィールドエラー表示用コンポーネント
 */
export interface FieldErrorProps {
  error?: string;
  className?: string;
}

export function FieldError({ error, className = '' }: FieldErrorProps) {
  if (!error) return null;

  return (
    <div className={`mt-1 flex items-center gap-1 ${className}`}>
      <AlertCircle className='h-3 w-3 flex-shrink-0 text-red-500' />
      <span className='text-xs text-red-600'>{error}</span>
    </div>
  );
}

/**
 * 成功メッセージ表示用コンポーネント
 */
export interface SuccessDisplayProps {
  message: string;
  onDismiss?: () => void;
  variant?: 'inline' | 'card' | 'toast';
  className?: string;
}

export function SuccessDisplay({
  message,
  onDismiss,
  variant = 'inline',
  className = '',
}: SuccessDisplayProps) {
  const content = (
    <div className={`flex items-start gap-3 ${className}`}>
      <div className='mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-green-500'>
        <svg
          className='h-3 w-3 text-white'
          fill='currentColor'
          viewBox='0 0 20 20'
        >
          <path
            fillRule='evenodd'
            d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
            clipRule='evenodd'
          />
        </svg>
      </div>
      <div className='min-w-0 flex-1'>
        <p className='text-sm text-green-700'>{message}</p>
        {onDismiss && (
          <Button
            variant='ghost'
            size='sm'
            onClick={onDismiss}
            className='mt-2 h-8 px-3 text-xs text-green-600 hover:bg-green-50'
          >
            <X className='mr-1 h-3 w-3' />
            閉じる
          </Button>
        )}
      </div>
    </div>
  );

  if (variant === 'card') {
    return (
      <Card className='border-green-200 bg-green-50'>
        <CardContent className='p-4'>{content}</CardContent>
      </Card>
    );
  }

  if (variant === 'toast') {
    return (
      <div className='rounded-lg border border-green-200 bg-green-50 p-4 shadow-lg'>
        {content}
      </div>
    );
  }

  return (
    <div className='rounded-md border border-green-200 bg-green-50 p-4'>
      {content}
    </div>
  );
}
