import React, { useEffect, useState } from 'react';
import { useLocation } from '@docusaurus/router';
import styles from './styles.module.css';

export default function LanguageAlert() {
  const [showAlert, setShowAlert] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    const userLanguage = navigator?.language || 'en';
    const isChineseUser = userLanguage.includes('zh');
    setShowAlert(isChineseUser);
    
  }, [pathname]);

  if (!showAlert) return null;

  return (
    <div className={styles.alert}>
      <span>检测到您的主要语言为中文，您可以访问由中文社区翻译的</span>
      <a href={'https://docs.frigate-cn.video'+pathname}>中文文档</a>
      <span> 以获得更好的体验</span>
    </div>
  );
}