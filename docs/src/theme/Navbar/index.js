import React from 'react';
import NavbarLayout from '@theme/Navbar/Layout';
import NavbarContent from '@theme/Navbar/Content';
import LanguageAlert from '../../components/LanguageAlert';

export default function Navbar() {
  return (
    <>
      <NavbarLayout>
        <NavbarContent />
      </NavbarLayout>
      <LanguageAlert />
    </>
  );
}