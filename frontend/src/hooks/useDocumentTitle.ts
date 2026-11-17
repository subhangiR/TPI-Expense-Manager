import { useEffect } from 'react';

// Sets the browser tab title. Screen readers announce it when you move between pages.
export default function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = `${title} · TPI Expense Manager`;
  }, [title]);
}
