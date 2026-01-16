/* ============================================================================
   ARQFORMA - SCRIPT PRINCIPAL
   Funcionalidades: Navegación, filtros portafolio, modal proyecto, calculadora
   presupuesto, animaciones de scroll, formulario de contacto, WhatsApp, guardado
   estimaciones (localStorage) y tracking básico.
   ============================================================================ */
'use strict';

const AF_CONFIG = {
  budget: {
    baseCostM2: {
      residencial: 550, // USD por m² estimación referencial
      comercial: 680,
      corporativo: 720,
      interiorismo: 450
    },
    calidadMultiplier: {
      estandar: 1,
      premium: 1.35,
      lujo: 1.65
    },
    complejidadMultiplier: {
      media: 1,
      alta: 1.25,
      muy_alta: 1.55
    },
    currency: 'MXN',
    mxnRate: 17.2 // conversión referencial USD -> MXN
  },
  validation: {
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, 
    phone: /^[0-9\s\-]{8,}$/,
    minName: 2
  },
  whatsapp: '+525511112222'
};

const AF_DOM = {
  header: document.getElementById('header'),
  navToggle: document.querySelector('.nav__toggle'),
  navMenu: document.querySelector('.nav__menu'),
  navLinks: document.querySelectorAll('.nav__link'),
  filterButtons: document.querySelectorAll('.portfolio__filters .filter-btn'),
  projects: document.querySelectorAll('.project'),
  stats: document.querySelectorAll('.stat'),
  budgetForm: document.getElementById('budgetForm'),
  budgetOutput: document.getElementById('budgetOutput'),
  saveEstimateBtn: document.getElementById('saveEstimate'),
  contactForm: document.getElementById('contactForm'),
  scrollTopBtn: document.querySelector('.scroll-top'),
  whatsappFloat: document.querySelector('.whatsapp-float')
};

/* =============================
   UTILIDADES
   ============================= */
function trackEvent(name, data={}) { console.log('📊', name, data); }

function formatCurrency(amount) {
  return new Intl.NumberFormat('es-MX',{ style:'currency', currency:'MXN', maximumFractionDigits:0 }).format(amount);
}

function showToast(message, type='success', timeout=4500){
  const existing = document.querySelectorAll('.af-toast');
  existing.forEach(e=>e.remove());
  const toast = document.createElement('div');
  toast.className = `af-toast af-toast--${type}`;
  toast.innerHTML = `<div class="af-toast__icon"><i class="fas ${type==='success'?'fa-check-circle': type==='error'?'fa-exclamation-circle':'fa-info-circle'}"></i></div><div class="af-toast__msg">${message}</div><button class="af-toast__close"><i class="fas fa-times"></i></button>`;
  Object.assign(toast.style,{
    position:'fixed',top:'20px',right:'20px',background:type==='success'?'#2563eb': type==='error'?'#dc2626':'#1f2937',color:'#fff',padding:'0.85rem 1rem',display:'flex',alignItems:'center',gap:'0.75rem',borderRadius:'14px',boxShadow:'0 12px 34px -8px rgba(0,0,0,.3)',zIndex:2000,font:'600 .75rem Urbanist'
  });
  document.body.appendChild(toast);
  const remove=()=>{ toast.style.transform='translateX(120%)'; toast.style.opacity='0'; setTimeout(()=>toast.remove(),320); };
  toast.querySelector('.af-toast__close').addEventListener('click',remove);
  setTimeout(remove, timeout);
}

/* =============================
   NAVEGACIÓN
   ============================= */
function initNavigation(){
  AF_DOM.navToggle?.addEventListener('click', ()=>{
    AF_DOM.navMenu.classList.toggle('active');
    AF_DOM.navToggle.querySelector('i').classList.toggle('fa-bars');
    AF_DOM.navToggle.querySelector('i').classList.toggle('fa-xmark');
    document.body.style.overflow = AF_DOM.navMenu.classList.contains('active') ? 'hidden' : '';
    trackEvent('nav_toggle',{ open:AF_DOM.navMenu.classList.contains('active') });
  });
  AF_DOM.navLinks.forEach(link => {
    link.addEventListener('click', e => {
      const href = link.getAttribute('href');
      if(href.startsWith('#')){
        e.preventDefault();
        const target = document.querySelector(href);
        if(target){
          const top = target.offsetTop - (AF_DOM.header?.offsetHeight||0) - 8;
          window.scrollTo({ top, behavior:'smooth' });
          AF_DOM.navMenu.classList.remove('active');
          document.body.style.overflow='';
        }
      }
    });
  });
  window.addEventListener('scroll', ()=>{
    AF_DOM.header.classList.toggle('scrolled', window.scrollY>50);
    AF_DOM.scrollTopBtn.classList.toggle('show', window.scrollY>600);
  }, { passive:true });
  AF_DOM.scrollTopBtn?.addEventListener('click',()=> window.scrollTo({ top:0, behavior:'smooth'}));
}

/* =============================
   CONTADORES HERO
   ============================= */
function animateStats(){
  AF_DOM.stats.forEach((stat, idx)=>{
    const numberEl = stat.querySelector('.stat__number');
    const target = parseInt(stat.getAttribute('data-count'),10);
    let current=0; const duration=1600; const start=performance.now();
    function update(ts){
      const progress=Math.min((ts-start)/duration,1);
      const eased=1 - Math.pow(1-progress,3);
      current = Math.floor(target*eased);
      numberEl.textContent=current.toLocaleString('es-MX');
      if(progress<1) requestAnimationFrame(update);
    }
    setTimeout(()=>requestAnimationFrame(update), idx*160);
  });
}
function initStatsObserver(){
  const hero = document.querySelector('.hero');
  if(!hero) return;
  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => { if(entry.isIntersecting){ animateStats(); obs.disconnect(); } });
  }, { threshold:.45 });
  obs.observe(hero);
}

/* =============================
   FILTRO PORTAFOLIO & MODAL
   ============================= */
function initPortfolioFilter(){
  AF_DOM.filterButtons.forEach(btn => {
    btn.addEventListener('click', ()=>{
      AF_DOM.filterButtons.forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.dataset.filter;
      AF_DOM.projects.forEach(project => {
        if(filter==='all' || project.dataset.category===filter){
          project.style.display='flex';
          requestAnimationFrame(()=> project.classList.add('animate'));
        } else project.style.display='none';
      });
      trackEvent('portfolio_filter',{ filter });
    });
  });
  // Modal de proyecto
  AF_DOM.projects.forEach(card => {
    card.addEventListener('click', ()=> openProjectModal(card));
  });
}

const PROJECT_DETAILS = {
  p1:{ titulo:'Casa Luminaria', ubicacion:'Valle de Bravo', superficie:'320 m²', anio:'2024', descripcion:'Diseño bioclimático con envolvente eficiente, patio central y integración topográfica.' },
  p2:{ titulo:'Retail Axis', ubicacion:'CDMX', superficie:'580 m²', anio:'2023', descripcion:'Flujo circular, iluminación controlada y módulos adaptativos para retail experiencial.' },
  p3:{ titulo:'Oficinas NeoCorp', ubicacion:'Monterrey', superficie:'1100 m²', anio:'2024', descripcion:'Espacios flexibles, núcleos colaborativos y gestión BIM integral para expansiones futuras.' },
  p4:{ titulo:'Loft Terracota', ubicacion:'Guadalajara', superficie:'210 m²', anio:'2023', descripcion:'Materialidad cálida, texturas naturales y aprovechamiento lumínico indirecto.' },
  p5:{ titulo:'Casa Patio Central', ubicacion:'Querétaro', superficie:'280 m²', anio:'2022', descripcion:'Patio bioclimático y estrategias pasivas de ventilación e iluminación.' },
  p6:{ titulo:'Food Hall Prisma', ubicacion:'CDMX', superficie:'750 m²', anio:'2025', descripcion:'Formato gastronómico modular, flujo radial y gestión de confort térmico.' }
};

function openProjectModal(card){
  const data = PROJECT_DETAILS[card.dataset.id];
  if(!data) return;
  const modal = document.createElement('div');
  modal.className='af-modal';
  modal.innerHTML = `
    <div class="af-modal__content">
      <button class="af-modal__close"><i class="fas fa-times"></i></button>
      <div class="af-modal__header">
        <h3>${data.titulo}</h3>
        <span>${data.ubicacion} • ${data.superficie} • ${data.anio}</span>
      </div>
      <div class="af-modal__body">
        <p>${data.descripcion}</p>
        <div class="af-modal__actions">
          <button class="btn btn--primary" data-modal-budget><i class="fas fa-calculator"></i> Estimar Similar</button>
          <button class="btn btn--outline" data-modal-contact><i class="fas fa-envelope"></i> Solicitar Info</button>
        </div>
      </div>
    </div>`;
  Object.assign(modal.style,{position:'fixed',inset:'0',background:'rgba(0,0,0,.65)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1500});
  document.body.appendChild(modal);
  const content = modal.querySelector('.af-modal__content');
  Object.assign(content.style,{background:'#fff',width:'min(520px,92%)',padding:'1.9rem 1.6rem 1.5rem',borderRadius:'1.35rem',boxShadow:'0 30px 70px -20px rgba(0,0,0,.35)',fontFamily:'Inter'});
  content.querySelector('h3').style.cssText='margin:0 0 .4rem;font:700 1.35rem Urbanist;';
  content.querySelector('span').style.cssText='font-size:.65rem;font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:#4b5563;';
  modal.querySelector('.af-modal__close').addEventListener('click',()=>modal.remove());
  modal.addEventListener('click',e=>{ if(e.target===modal) modal.remove(); });
  content.querySelector('[data-modal-budget]')?.addEventListener('click',()=>{ modal.remove(); document.querySelector('#calculadora').scrollIntoView({behavior:'smooth'}); });
  content.querySelector('[data-modal-contact]')?.addEventListener('click',()=>{ modal.remove(); document.querySelector('#contacto').scrollIntoView({behavior:'smooth'}); });
  trackEvent('project_modal_open',{ project: card.dataset.id });
}

/* =============================
   CALCULADORA PRESUPUESTO
   ============================= */
function calculateBudget(data){
  const baseUSD = AF_CONFIG.budget.baseCostM2[data.tipo] || 550;
  const calidadMult = AF_CONFIG.budget.calidadMultiplier[data.calidad] || 1;
  const complejidadMult = AF_CONFIG.budget.complejidadMultiplier[data.complejidad] || 1;
  const superficie = Math.max(parseFloat(data.superficie)||0,10);
  const subtotalUSD = superficie * baseUSD * calidadMult * complejidadMult;
  const totalMXN = subtotalUSD * AF_CONFIG.budget.mxnRate;
  return { subtotalUSD, totalMXN, superficie, baseUSD, calidadMult, complejidadMult };
}

function initBudgetCalculator(){
  if(!AF_DOM.budgetForm) return;
  AF_DOM.budgetForm.addEventListener('submit', e => {
    e.preventDefault();
    const formData = Object.fromEntries(new FormData(AF_DOM.budgetForm).entries());
    const result = calculateBudget(formData);
    const detalle = `Estimación: ${formatCurrency(result.totalMXN)} MXN \n(USD ~ ${result.subtotalUSD.toLocaleString('en-US',{maximumFractionDigits:0})}) | Superficie: ${result.superficie} m²`;
    AF_DOM.budgetOutput.textContent = detalle;
    AF_DOM.budgetOutput.style.opacity='1';
    showToast('Estimación generada','success');
    trackEvent('budget_calculated', { ...result, tipo:formData.tipo });
  });
  AF_DOM.saveEstimateBtn?.addEventListener('click', ()=>{
    const text = AF_DOM.budgetOutput.textContent.trim();
    if(!text || text.includes('Ingresa')){ showToast('Calcula antes de guardar','error'); return; }
    const saved = JSON.parse(localStorage.getItem('af_estimates')||'[]');
    saved.push({ text, timestamp: Date.now() });
    localStorage.setItem('af_estimates', JSON.stringify(saved));
    showToast('Estimación guardada','success');
    trackEvent('budget_saved',{ count:saved.length });
  });
}

/* =============================
   FORMULARIO CONTACTO
   ============================= */
function validateField(field){
  const value = field.value.trim();
  let valid=true, msg='';
  if(field.hasAttribute('required') && !value){ valid=false; msg='Obligatorio'; }
  if(valid && field.type==='email' && !AF_CONFIG.validation.email.test(value)){ valid=false; msg='Email inválido'; }
  if(valid && field.name==='nombre' && value.length < AF_CONFIG.validation.minName){ valid=false; msg='Nombre corto'; }
  if(!valid){ field.classList.add('error'); let err = field.parentNode.querySelector('.field-error'); if(!err){ err=document.createElement('div'); err.className='field-error'; field.parentNode.appendChild(err); } err.textContent=msg; } else { field.classList.remove('error'); const err=field.parentNode.querySelector('.field-error'); if(err) err.remove(); }
  return valid;
}

function initContactForm(){
  if(!AF_DOM.contactForm) return;
  const inputs = AF_DOM.contactForm.querySelectorAll('input, select, textarea');
  inputs.forEach(i=>{
    i.addEventListener('blur', ()=> validateField(i));
    i.addEventListener('input', ()=>{ i.classList.remove('error'); const err=i.parentNode.querySelector('.field-error'); if(err) err.remove(); });
  });
  AF_DOM.contactForm.addEventListener('submit', e => {
    e.preventDefault();
    let ok=true; inputs.forEach(f=>{ if(!validateField(f)) ok=false; });
    if(!ok){ showToast('Corrige errores del formulario','error'); return; }
    const data = Object.fromEntries(new FormData(AF_DOM.contactForm).entries());
    trackEvent('contact_request', data);
    const btn = AF_DOM.contactForm.querySelector('button[type="submit"]');
    btn.disabled=true; btn.innerHTML='<i class="fas fa-spinner fa-spin"></i> Enviando...';
    setTimeout(()=>{
      showToast('Solicitud enviada. Respuesta en 24h.','success',6000);
      AF_DOM.contactForm.reset();
      btn.disabled=false; btn.innerHTML='<i class="fas fa-paper-plane"></i> Enviar Solicitud';
    },1800);
  });
}

/* =============================
   ANIMACIONES SCROLL
   ============================= */
function initScrollAnimations(){
  const animated = document.querySelectorAll('.project, .service, .testimonial, .step, .budget__form, .budget__result');
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => { if(e.isIntersecting){ e.target.classList.add('animate'); obs.unobserve(e.target); } });
  }, { threshold:.15, rootMargin:'0px 0px -50px 0px' });
  animated.forEach(el => obs.observe(el));
}

/* =============================
   WHATSAPP & GLOBAL
   ============================= */
function openWhatsApp(message='Hola, quisiera información de un proyecto.'){
  const url = `https://wa.me/${AF_CONFIG.whatsapp.replace(/\D/g,'')}?text=${encodeURIComponent(message)}`;
  window.open(url,'_blank');
  trackEvent('whatsapp_click',{ message });
}
function initWhatsApp(){ AF_DOM.whatsappFloat?.addEventListener('click', e=>{ e.preventDefault(); openWhatsApp(); }); }

/* =============================
   INICIALIZACIÓN
   ============================= */
document.addEventListener('DOMContentLoaded', ()=>{
  initNavigation();
  initStatsObserver();
  initPortfolioFilter();
  initBudgetCalculator();
  initContactForm();
  initScrollAnimations();
  initWhatsApp();
  trackEvent('page_loaded', { page:'arqforma_studio' });
  console.log('✅ ArqForma Studio inicializado');
});

// Exponer global
window.openWhatsApp = openWhatsApp;