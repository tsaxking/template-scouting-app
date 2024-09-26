import '../styles/animate.css';
import '../styles/bootstrap-colors-extended.css';
import '../styles/bs-overwrite.css';
import '../styles/global.css';
import '../styles/style.css';

// bootstrap
import 'bootstrap/dist/css/bootstrap.css';

// material icons
import 'material-icons/iconfont/material-icons.css';
// bootstrap icons
import 'bootstrap-icons/font/bootstrap-icons.css';
// fontawesome
import '@fortawesome/fontawesome-free/css/all.css';

// socket
import './socket';

// bootstrap cdn
import 'bootstrap/dist/js/bootstrap.bundle.min.js';

// settings
import './settings';
import './socket';

import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);
