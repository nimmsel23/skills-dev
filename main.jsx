import React from 'react';
import { createRoot } from 'react-dom/client';
import CoreSkills from './CoreSkills.jsx';
import './styles.css';

document.documentElement.setAttribute('data-theme', 'skills');
createRoot(document.getElementById('root')).render(<React.StrictMode><CoreSkills /></React.StrictMode>);
