'use client';

import ToastContainer from './Toast';
import ThemeToggle from './ThemeToggle';
import Onboarding from './Onboarding';

export default function GlobalShell() {
  return (
    <>
      <ToastContainer />
      <ThemeToggle />
      <Onboarding />
    </>
  );
}
