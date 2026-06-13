import React from 'react';
import './MascotGreeter.css';
import mascotTravel from './assets/pony-travel-welcome.webp';

export default function MascotGreeter() {
  return (
    <div className="ir-mascot-greeter" aria-hidden="true">
      <div className="ir-mascot-welcome-bubble">
        <span>Welcome!</span>
      </div>

      <div className="ir-mascot-photo-wrap">
        <img src={mascotTravel} alt="" className="ir-mascot-photo" draggable="false" />
      </div>

      <div className="ir-mascot-shadow" />
    </div>
  );
}
