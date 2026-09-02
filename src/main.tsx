import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {ErrorBoundary} from './components/ErrorBoundary.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary
      fallbackTitle="Đã xảy ra sự cố không mong muốn"
      fallbackDescription="Ứng dụng gặp sự cố ngoài dự kiến. Bạn có thể tải lại trang hoặc khôi phục về trạng thái mẫu ban đầu."
    >
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
