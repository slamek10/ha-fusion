var e={color:`rgba(255, 255, 255, 0.15)`,opacity:.5,spreadingDuration:`300ms`,spreadingTimingFunction:`ease-in-out`,clearingDuration:`350ms`,clearingTimingFunction:`ease-in-out`};function t(t,n={}){let r={...e,...n};function i(e){let n=t.getBoundingClientRect(),i=e.clientX-n.left,a=e.clientY-n.top,o=Math.max(n.width,n.height)*2,s=document.createElement(`span`);s.style.cssText=`
			position: absolute;
			border-radius: 50%;
			pointer-events: none;
			width: ${o}px;
			height: ${o}px;
			left: ${i-o/2}px;
			top: ${a-o/2}px;
			background: ${r.color};
			opacity: 0;
			transform: scale(0);
			transition: transform ${r.spreadingDuration} ${r.spreadingTimingFunction},
			            opacity ${r.spreadingDuration} ${r.spreadingTimingFunction};
		`,getComputedStyle(t).position===`static`&&(t.style.position=`relative`),t.style.overflow=`hidden`,t.appendChild(s),requestAnimationFrame(()=>{s.style.transform=`scale(1)`,s.style.opacity=String(r.opacity)});function c(){s.style.transition=`opacity ${r.clearingDuration} ${r.clearingTimingFunction}`,s.style.opacity=`0`,s.addEventListener(`transitionend`,()=>s.remove(),{once:!0}),setTimeout(()=>s.remove(),1e3),window.removeEventListener(`pointerup`,c),window.removeEventListener(`pointercancel`,c)}window.addEventListener(`pointerup`,c,{once:!0}),window.addEventListener(`pointercancel`,c,{once:!0})}return t.addEventListener(`pointerdown`,i),{update(t){r={...e,...t}},destroy(){t.removeEventListener(`pointerdown`,i)}}}export{t};