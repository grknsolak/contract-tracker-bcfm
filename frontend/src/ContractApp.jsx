import React, { useEffect, useMemo, useState } from "react";
import { logout, listContracts, addContract, updateContract, removeContract, listCustomers, addCustomer, updateCustomer, removeCustomer, syncCustomers, listRevenue, addRevenue, updateRevenue, removeRevenue } from "./api";

const TEAM_OPTIONS  = ["Team B", "Mando", "Solid", "Şisecam", "Atlas", "Apex"];
const OWNER_OPTIONS = ["Onur", "Döndü", "Gürkan"];
const SCOPE_OPTIONS = ["DaaS", "7/24 Support", "Man/Day", "Outsource", "Fix", "AWS Resell"];

function formatDateISO(d){ return new Date(d).toISOString().slice(0,10); }
function addMonths(dateStr, m){ const d=new Date(dateStr); d.setMonth(d.getMonth()+m); return formatDateISO(d); }
function addYears(dateStr, y){ const d=new Date(dateStr); d.setFullYear(d.getFullYear()+y); return formatDateISO(d); }
function daysLeft(endISO){ if(!endISO) return null; const end=new Date(endISO), today=new Date(); return Math.ceil((end - today)/(1000*60*60*24)); }

export default function ContractApp({ user, setUser }) {
  const [tab, setTab] = useState("list");
  const [contracts, setContracts] = useState([]);
  const [customers, setCustomers] = useState([]);

  const [form, setForm] = useState({
    name:"", duration:"", scope:[], team:"", owner:"", startDate:"", endDate:""
  });

  useEffect(()=>{
    if(!form.startDate || !form.duration) return;
    const end = form.duration==="6ay" ? addMonths(form.startDate,6) : addYears(form.startDate,1);
    setForm(f=>({...f,endDate:end}));
  }, [form.startDate, form.duration]);

  useEffect(()=>{
    (async()=>{
      try{
        const [c,m,r] = await Promise.all([listContracts(), listCustomers(), listRevenue()]);
        setContracts(c.data||[]);
        setCustomers(m.data||[]);
        setRevenueHistory(r.data||[]);
      }catch(e){ console.error(e); }
    })();
  },[]);

  const doLogout = async ()=>{ try{ await logout(); }catch{} setUser?.(null); };

  const saveContract = async ()=>{
    if(!form.name || !form.team || !form.owner || !form.startDate || !form.endDate){
      alert("Lütfen zorunlu alanları doldurun."); return;
    }
    try{
      const { data } = await addContract(form);
      setContracts(prev=>[data, ...prev]);
      setForm({name:"",duration:"",scope:[],team:"",owner:"",startDate:"",endDate:""});
      setTab("list");
    }catch(e){ alert(e?.response?.data?.error || "Kayıt başarısız"); }
  };

  const deleteContract = async (id)=>{
    if(!confirm("Silmek istiyor musunuz?")) return;
    try{ await removeContract(id); setContracts(prev=>prev.filter(x=>x.id!==id)); }
    catch{ alert("Silme hatası"); }
  };

  const [custName,setCustName]=useState(""); const [custStatus,setCustStatus]=useState("Aktif");
  const [selectedRevenueCustomer, setSelectedRevenueCustomer] = useState(null);
  const [editingRevenue, setEditingRevenue] = useState(null);
  const [revenueEditData, setRevenueEditData] = useState({});
  const [editingMainRevenue, setEditingMainRevenue] = useState(null);
  const [mainRevenueEditData, setMainRevenueEditData] = useState({});
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [editData, setEditData] = useState({});
  const [editingContract, setEditingContract] = useState(null);
  const [contractEditData, setContractEditData] = useState({});
  const [selectedQuarter, setSelectedQuarter] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerContracts, setCustomerContracts] = useState([]);
  const [revenueHistory, setRevenueHistory] = useState([]);
  const [revenueForm, setRevenueForm] = useState({
    customerId: '', year: new Date().getFullYear(), amount: '', currency: 'TL'
  });
  
  const addCust = async ()=>{
    if(!custName.trim()) return;
    try{
      const { data } = await addCustomer(custName.trim(), custStatus);
      setCustomers(prev=>[data, ...prev]); setCustName(""); setCustStatus("Aktif");
    }catch(e){ alert(e?.response?.data?.error || "Müşteri kaydı başarısız"); }
  };

  const startEdit = (customer) => {
    setEditingCustomer(customer.id);
    setEditData({ name: customer.name, status: customer.status });
  };

  const saveEdit = async (id) => {
    if(!editData.name?.trim()) return;
    try{
      const { data } = await updateCustomer(id, editData.name.trim(), editData.status);
      setCustomers(prev => prev.map(c => c.id === id ? data : c));
      setEditingCustomer(null);
      setEditData({});
    }catch(e){ alert(e?.response?.data?.error || "Güncelleme başarısız"); }
  };

  const cancelEdit = () => {
    setEditingCustomer(null);
    setEditData({});
  };

  const exportScopeReport = async (scope, scopeContracts) => {
    if (scopeContracts.length === 0) return;
    
    try {
      const XLSX = await import('xlsx');
      
      const data = [
        ['Sözleşme Adı', 'Takım', 'Sahip', 'Başlangıç', 'Bitiş', 'Süre'],
        ...scopeContracts.map(c => [
          c.name,
          c.team,
          c.owner,
          c.startDate ? new Date(c.startDate).toLocaleDateString('tr-TR') : '-',
          c.endDate ? new Date(c.endDate).toLocaleDateString('tr-TR') : '-',
          c.duration === '6ay' ? '6 Ay' : '1 Yıl'
        ])
      ];

      const ws = XLSX.utils.aoa_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, scope);
      
      ws['!cols'] = [
        { width: 30 }, { width: 15 }, { width: 15 }, 
        { width: 15 }, { width: 15 }, { width: 10 }
      ];

      XLSX.writeFile(wb, `${scope}_sozlesmeler_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      alert('Excel dosyası oluşturulurken hata oluştu');
    }
  };

  const getQuarterContracts = (quarter) => {
    const currentYear = new Date().getFullYear();
    const quarterMonths = {
      'Q1': [1, 2, 3],
      'Q2': [4, 5, 6], 
      'Q3': [7, 8, 9],
      'Q4': [10, 11, 12]
    };
    
    return contracts.filter(c => {
      if (!c.endDate) return false;
      const endDate = new Date(c.endDate);
      const endYear = endDate.getFullYear();
      const endMonth = endDate.getMonth() + 1;
      
      return endYear >= currentYear && quarterMonths[quarter].includes(endMonth);
    });
  };

  const getQuarterPeriod = (quarter) => {
    const periods = {
      'Q1': 'Ocak - Mart',
      'Q2': 'Nisan - Haziran',
      'Q3': 'Temmuz - Eylül',
      'Q4': 'Ekim - Aralık'
    };
    return periods[quarter];
  };

  const exportAllScopesReport = async () => {
    try {
      const XLSX = await import('xlsx');
      const wb = XLSX.utils.book_new();
      
      // Her kapsam için ayrı sheet
      SCOPE_OPTIONS.forEach(scope => {
        const scopeContracts = contracts.filter(c => 
          Array.isArray(c.scope) && c.scope.includes(scope)
        );
        
        if (scopeContracts.length > 0) {
          const data = [
            ['Sözleşme Adı', 'Takım', 'Sahip', 'Başlangıç', 'Bitiş', 'Süre'],
            ...scopeContracts.map(c => [
              c.name, c.team, c.owner,
              c.startDate ? new Date(c.startDate).toLocaleDateString('tr-TR') : '-',
              c.endDate ? new Date(c.endDate).toLocaleDateString('tr-TR') : '-',
              c.duration === '6ay' ? '6 Ay' : '1 Yıl'
            ])
          ];
          
          const ws = XLSX.utils.aoa_to_sheet(data);
          ws['!cols'] = [{ width: 30 }, { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 }, { width: 10 }];
          XLSX.utils.book_append_sheet(wb, ws, scope.replace('/', '-'));
        }
      });
      
      // Özet sheet
      const summaryData = [
        ['Kapsam', 'Sözleşme Sayısı'],
        ...SCOPE_OPTIONS.map(scope => [
          scope,
          contracts.filter(c => Array.isArray(c.scope) && c.scope.includes(scope)).length
        ])
      ];
      
      const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
      summaryWs['!cols'] = [{ width: 20 }, { width: 15 }];
      XLSX.utils.book_append_sheet(wb, summaryWs, 'Özet');
      
      XLSX.writeFile(wb, `kapsam_raporlari_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      alert('Excel dosyası oluşturulurken hata oluştu');
    }
  };

  const syncExistingCustomers = async () => {
    try {
      const { data } = await syncCustomers();
      alert(`${data.added} yeni müşteri eklendi!`);
      const customers = await listCustomers();
      setCustomers(customers.data || []);
    } catch (e) {
      alert('Senkronizasyon hatası');
    }
  };

  const exportToGoogleCalendar = async () => {
    if (!window.gapi) {
      alert('Google API yüklenmedi. Sayfayı yenileyin.');
      return;
    }

    try {
      // Google API'yi başlat
      await window.gapi.load('auth2', async () => {
        const authInstance = window.gapi.auth2.getAuthInstance();
        if (!authInstance.isSignedIn.get()) {
          await authInstance.signIn();
        }
        
        await createCalendarEvents();
      });
    } catch (error) {
      console.error('Google Calendar hatası:', error);
      alert('Google Calendar bağlantısı başarısız. Lütfen tekrar deneyin.');
    }
  };

  const createCalendarEvents = async () => {
    const now = new Date();
    let createdEvents = 0;

    for (const contract of contracts) {
      if (!contract.endDate) continue;
      
      const endDate = new Date(contract.endDate);
      const reminder60 = new Date(endDate);
      reminder60.setDate(endDate.getDate() - 60);
      const reminder30 = new Date(endDate);
      reminder30.setDate(endDate.getDate() - 30);
      
      // 60 gün öncesi etkinlik
      if (reminder60 > now) {
        await createGoogleCalendarEvent({
          summary: `⚠️ Sözleşme Hatırlatıcısı - ${contract.name}`,
          description: `${contract.name} sözleşmesi 60 gün içinde sona erecek.\n\nDetaylar:\n- Takım: ${contract.team}\n- Sahip: ${contract.owner}\n- Bitiş Tarihi: ${endDate.toLocaleDateString('tr-TR')}`,
          start: reminder60,
          end: new Date(reminder60.getTime() + 60*60*1000),
          attendees: getContractAttendees(contract)
        });
        createdEvents++;
      }
      
      // 30 gün öncesi etkinlik
      if (reminder30 > now) {
        await createGoogleCalendarEvent({
          summary: `🚨 KRİTİK - Sözleşme Hatırlatıcısı - ${contract.name}`,
          description: `${contract.name} sözleşmesi 30 gün içinde sona erecek! ACELE EDİN!\n\nDetaylar:\n- Takım: ${contract.team}\n- Sahip: ${contract.owner}\n- Bitiş Tarihi: ${endDate.toLocaleDateString('tr-TR')}`,
          start: reminder30,
          end: new Date(reminder30.getTime() + 60*60*1000),
          attendees: getContractAttendees(contract)
        });
        createdEvents++;
      }
    }
    
    alert(`${createdEvents} hatırlatıcı Google Takvim'e eklendi!`);
  };

  const createGoogleCalendarEvent = async (eventData) => {
    const event = {
      summary: eventData.summary,
      description: eventData.description,
      start: {
        dateTime: eventData.start.toISOString(),
        timeZone: 'Europe/Istanbul'
      },
      end: {
        dateTime: eventData.end.toISOString(),
        timeZone: 'Europe/Istanbul'
      },
      attendees: eventData.attendees,
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 }, // 1 gün öncesi email
          { method: 'popup', minutes: 60 }       // 1 saat öncesi popup
        ]
      }
    };

    return new Promise((resolve, reject) => {
      window.gapi.client.calendar.events.insert({
        calendarId: 'primary',
        resource: event
      }).then(resolve).catch(reject);
    });
  };

  const getContractAttendees = (contract) => {
    const emailMap = {
      'Onur': 'onur@bcfm.com',
      'Döndü': 'dondu@bcfm.com', 
      'Gürkan': 'gurkan@bcfm.com'
    };
    
    const attendees = [];
    if (emailMap[contract.owner]) {
      attendees.push({ email: emailMap[contract.owner] });
    }
    
    return attendees;
  };



  const exportToExcel = async () => {
    if (customers.length === 0) {
      alert("Dışa aktarılacak müşteri bulunamadı");
      return;
    }

    try {
      const XLSX = await import('xlsx');
      
      const data = [
        ['Müşteri Adı', 'Durum', 'Oluşturma Tarihi'],
        ...customers.map(c => [
          c.name,
          c.status,
          c.createdAt ? new Date(c.createdAt).toLocaleDateString('tr-TR') : '-'
        ])
      ];

      const ws = XLSX.utils.aoa_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Müşteriler');
      
      // Sütun genişliklerini ayarla
      ws['!cols'] = [
        { width: 25 }, // Müşteri Adı
        { width: 15 }, // Durum
        { width: 20 }  // Oluşturma Tarihi
      ];

      XLSX.writeFile(wb, `musteriler_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error('Excel export hatası:', error);
      alert('Excel dosyası oluşturulurken hata oluştu');
    }
  };

  const deleteCust = async (id) => {
    if(!confirm("Müşteriyi silmek istiyor musunuz?")) return;
    try{
      await removeCustomer(id);
      setCustomers(prev => prev.filter(c => c.id !== id));
    }catch(e){ alert("Silme hatası"); }
  };

  const openCustomerDetail = (customer) => {
    const relatedContracts = contracts.filter(c => 
      c.name.toLowerCase().includes(customer.name.toLowerCase())
    );
    setCustomerContracts(relatedContracts);
    setSelectedCustomer(customer);
  };

  const closeCustomerDetail = () => {
    setSelectedCustomer(null);
    setCustomerContracts([]);
  };

  const startContractEdit = (contract) => {
    setEditingContract(contract.id);
    setContractEditData({
      name: contract.name,
      duration: contract.duration,
      scope: contract.scope || [],
      team: contract.team,
      owner: contract.owner,
      startDate: contract.startDate,
      endDate: contract.endDate
    });
  };

  const saveContractEdit = async (id) => {
    if(!contractEditData.name?.trim()) return;
    try{
      const { data } = await updateContract(id, contractEditData);
      setContracts(prev => prev.map(c => c.id === id ? data : c));
      setEditingContract(null);
      setContractEditData({});
    }catch(e){ alert(e?.response?.data?.error || "Güncelleme başarısız"); }
  };

  const cancelContractEdit = () => {
    setEditingContract(null);
    setContractEditData({});
  };

  const addRevenueRecord = async () => {
    if (!revenueForm.customerId || !revenueForm.year || !revenueForm.amount) {
      alert('Lütfen tüm alanları doldurun'); return;
    }
    try {
      const { data } = await addRevenue({
        customerId: parseInt(revenueForm.customerId),
        year: parseInt(revenueForm.year),
        amount: parseFloat(revenueForm.amount),
        currency: revenueForm.currency
      });
      setRevenueHistory(prev => [...prev, data]);
      setRevenueForm({customerId: '', year: new Date().getFullYear(), amount: '', currency: 'TL'});
    } catch (e) {
      alert(e?.response?.data?.error || 'Kaydetme hatası');
    }
  };

  const deleteRevenueRecord = async (id) => {
    if (!confirm('Kaydı silmek istiyor musunuz?')) return;
    try {
      await removeRevenue(id);
      setRevenueHistory(prev => prev.filter(r => r.id !== id));
    } catch (e) {
      alert('Silme hatası');
    }
  };

  const getCustomerRevenue = (customerId) => {
    return revenueHistory
      .filter(r => r.customerId === customerId)
      .sort((a, b) => a.year - b.year);
  };

  const calculateGrowth = (current, previous) => {
    if (!previous) return null;
    const growth = ((current - previous) / previous) * 100;
    return growth;
  };

  const startRevenueEdit = (record) => {
    setEditingRevenue(record.id);
    setRevenueEditData({
      customerId: record.customerId,
      year: record.year,
      amount: record.amount,
      currency: record.currency || 'TL'
    });
  };

  const saveRevenueEdit = async (id) => {
    if (!revenueEditData.year || !revenueEditData.amount) {
      alert('Lütfen tüm alanları doldurun'); return;
    }
    try {
      const { data } = await updateRevenue(id, {
        year: parseInt(revenueEditData.year),
        amount: parseFloat(revenueEditData.amount),
        currency: revenueEditData.currency || 'TL'
      });
      setRevenueHistory(prev => prev.map(r => r.id === id ? data : r));
      setEditingRevenue(null);
      setRevenueEditData({});
    } catch (e) {
      alert('Güncelleme hatası');
    }
  };

  const cancelRevenueEdit = () => {
    setEditingRevenue(null);
    setRevenueEditData({});
  };

  const startMainRevenueEdit = (customerId) => {
    const customer = customersWithRevenue.find(c => c.id === customerId);
    const lastRecord = customer.revenue[customer.revenue.length - 1];
    if (lastRecord) {
      setEditingMainRevenue(customerId);
      setMainRevenueEditData({
        year: lastRecord.year,
        amount: lastRecord.amount,
        currency: lastRecord.currency || 'TL',
        recordId: lastRecord.id
      });
    }
  };

  const saveMainRevenueEdit = async () => {
    if (!mainRevenueEditData.year || !mainRevenueEditData.amount) {
      alert('Lütfen tüm alanları doldurun'); return;
    }
    try {
      const { data } = await updateRevenue(mainRevenueEditData.recordId, {
        year: parseInt(mainRevenueEditData.year),
        amount: parseFloat(mainRevenueEditData.amount),
        currency: mainRevenueEditData.currency || 'TL'
      });
      setRevenueHistory(prev => prev.map(r => r.id === mainRevenueEditData.recordId ? data : r));
      setEditingMainRevenue(null);
      setMainRevenueEditData({});
    } catch (e) {
      alert('Güncelleme hatası');
    }
  };

  const cancelMainRevenueEdit = () => {
    setEditingMainRevenue(null);
    setMainRevenueEditData({});
  };

  const soon30 = useMemo(()=> contracts.filter(c => {
    const d=daysLeft(c.endDate); return d!=null && d<=30 && d>0;
  }), [contracts]);

  const soon60 = useMemo(()=> contracts.filter(c => {
    const d=daysLeft(c.endDate); return d!=null && d>30 && d<=60;
  }), [contracts]);

  const expired = useMemo(()=> contracts.filter(c => {
    const d=daysLeft(c.endDate); return d!=null && d<=0 && d>=-15;
  }), [contracts]);

  const customersWithRevenue = useMemo(() => {
    return customers.map(customer => {
      const revenue = getCustomerRevenue(customer.id);
      const totalRevenue = revenue.reduce((sum, r) => sum + r.amount, 0);
      const lastYear = revenue.length > 0 ? revenue[revenue.length - 1] : null;
      const previousYear = revenue.length > 1 ? revenue[revenue.length - 2] : null;
      const growth = lastYear && previousYear ? calculateGrowth(lastYear.amount, previousYear.amount) : null;
      
      return {
        ...customer,
        revenue,
        totalRevenue,
        lastYearAmount: lastYear?.amount || 0,
        lastYearCurrency: lastYear?.currency || 'TL',
        growth
      };
    });
  }, [customers, revenueHistory]);

  return (
    <div className="screen">
      <header className="header glass">
        <div className="brand gradient-text">
          ☁️
          <span>BCFM <span className="brand-separator">|</span> <span className="brand-highlight">Agreement</span></span>
        </div>
        <nav className="tabs">
          <button className={`tab ${tab==="new"?"active":""}`} onClick={()=>setTab("new")}>
            ➕ Yeni Kayıt
          </button>
          <button className={`tab ${tab==="list"?"active":""}`} onClick={()=>setTab("list")}>
            📄 Sözleşmeler
          </button>
          <button className={`tab ${tab==="customers"?"active":""}`} onClick={()=>setTab("customers")}>
            🏢 Müşteriler
          </button>
          <button className={`tab ${tab==="reports"?"active":""}`} onClick={()=>setTab("reports")}>
            📈 Raporlar
          </button>
          <button className={`tab ${tab==="revenue"?"active":""}`} onClick={()=>setTab("revenue")}>
            💰 Sözleşme Geçmişi
          </button>
          <button className="logout-btn" onClick={doLogout}>
            🚪 Çıkış
          </button>
        </nav>
      </header>

      <main className="container space-y">
        {tab==="new" && (
          <section className="card space-y glass float">


            <div className="grid two">
              <label className="field">
                <span className="label">📄 Sözleşme Adı</span>
                <input 
                  className="interactive"
                  value={form.name} 
                  onChange={e=>setForm({...form,name:e.target.value})} 
                  placeholder="Sözleşme adını girin"
                />
              </label>
              <label className="field">
                <span className="label">⏰ Sözleşme Süresi</span>
                <select className="interactive" value={form.duration} onChange={v=>setForm({...form, duration:v.target.value})}>
                  <option value="">Süre Seçin</option>
                  <option value="6ay">6 Ay</option>
                  <option value="1yil">1 Yıl</option>
                </select>
              </label>
            </div>

            <div className="field">
              <span className="label">🔍 Sözleşme Kapsamı</span>
              <div className="chips">
                {SCOPE_OPTIONS.map(opt=>{
                  const on=form.scope.includes(opt);
                  return (
                    <button key={opt}
                      className={`chip ${on?"on":""}`}
                      onClick={()=> setForm(f=>{
                        const on2 = f.scope.includes(opt);
                        return {...f, scope: on2 ? f.scope.filter(x=>x!==opt) : [...f.scope,opt]};
                      })}
                    >{opt}</button>
                  );
                })}
              </div>
            </div>

            <div className="grid two">
              <label className="field">
                <span className="label">💼 Takım Bilgisi</span>
                <select className="interactive" value={form.team} onChange={e=>setForm({...form,team:e.target.value})}>
                  <option value="">Takım Seçin</option>
                  {TEAM_OPTIONS.map(t=><option key={t} value={t}>{t}</option>)}
                </select>
              </label>

              <label className="field">
                <span className="label">👨‍💼 Sözleşme Sahibi</span>
                <select className="interactive" value={form.owner} onChange={e=>setForm({...form,owner:e.target.value})}>
                  <option value="">Sahip Seçin</option>
                  {OWNER_OPTIONS.map(o=><option key={o} value={o}>{o}</option>)}
                </select>
              </label>
            </div>

            <div className="grid two">
              <label className="field">
                <span className="label">📅 Başlangıç Tarihi</span>
                <input 
                  className="interactive"
                  type="date" 
                  value={form.startDate} 
                  onChange={e=>setForm({...form,startDate:e.target.value})}
                />
              </label>
              <label className="field">
                <span className="label">📅 Bitiş Tarihi</span>
                <input 
                  className="glass"
                  type="date" 
                  value={form.endDate} 
                  readOnly
                  style={{opacity: 0.8}}
                />
              </label>
            </div>

            <div className="right">
              <button 
                className="btn glow-on-hover" 
                onClick={()=>setForm({name:"",duration:"",scope:[],team:"",owner:"",startDate:"",endDate:""})}
              >
                🗑️ Temizle
              </button>
              <button className="btn primary glow-on-hover" onClick={saveContract}>
                💾 Kaydet
              </button>
            </div>
          </section>
        )}

        {tab==="list" && (
          <>
            <div className="grid two">
              <div className="card glass float">
                <div className="alert-header">
                  <div className="badge critical-badge">🔥 KRİTİK</div>
                  <div className="badge critical-text-badge">30 GÜN İÇİNDE BİTECEKLER</div>
                </div>
                {soon30.length===0 ? (
                  <div className="muted">Kayıt yok</div>
                ) : (
                  soon30.map(c=>(
                    <div key={c.id} className="row-pill">
                      <span>{c.name}</span>
                      <span className="pill critical">{daysLeft(c.endDate)} gün</span>
                    </div>
                  ))
                )}
              </div>
              <div className="card glass float">
                <div className="alert-header">
                  <div className="badge warning-badge">⚠️ YAKLAŞAN</div>
                  <div className="badge warning-text-badge">60 GÜN İÇİNDE BİTECEKLER</div>
                </div>
                {soon60.length===0 ? (
                  <div className="muted">Kayıt yok</div>
                ) : (
                  soon60.map(c=>(
                    <div key={c.id} className="row-pill">
                      <span>{c.name}</span>
                      <span className="pill warning">{daysLeft(c.endDate)} gün</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="card glass float" style={{marginTop: '1rem'}}>
              <div className="alert-header">
                <div className="badge" style={{background: '#dc2626'}}>❌ SÜRESİ GEÇMİŞ</div>
                <div className="badge" style={{background: '#991b1b', color: 'white'}}>SON 15 GÜN</div>
              </div>
              {expired.length===0 ? (
                <div className="muted">Kayıt yok</div>
              ) : (
                expired.map(c=>(
                  <div key={c.id} className="row-pill">
                    <span>{c.name}</span>
                    <span className="pill" style={{background: '#dc2626', color: 'white'}}>{Math.abs(daysLeft(c.endDate))} gün önce</span>
                  </div>
                ))
              )}
            </div>

            <section className="card glass">
              <div className="table-wrap">
                <div className="table-header-badge">
                  SÖZLEŞME BİLGİLERİ
                </div>
                <table>
                  <thead>
                    <tr>
                      <th>Ad</th><th>Süre</th><th>Kapsam</th><th>Takım</th><th>Sahip</th><th>Başlangıç</th><th>Bitiş</th><th className="right">İşlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contracts.sort((a, b) => {
                      if (!a.endDate) return 1;
                      if (!b.endDate) return -1;
                      return new Date(a.endDate) - new Date(b.endDate);
                    }).map(c=>(
                      <tr key={c.id}>
                        <td>
                          {editingContract === c.id ? (
                            <input 
                              className="interactive"
                              value={contractEditData.name || ''}
                              onChange={(e) => setContractEditData({...contractEditData, name: e.target.value})}
                              style={{width: '100%', margin: 0}}
                              autoFocus
                            />
                          ) : (
                            c.name
                          )}
                        </td>
                        <td>
                          {editingContract === c.id ? (
                            <select 
                              className="interactive"
                              value={contractEditData.duration || '6ay'}
                              onChange={(e) => setContractEditData({...contractEditData, duration: e.target.value})}
                              style={{width: '100%', margin: 0}}
                            >
                              <option value="6ay">6 Ay</option>
                              <option value="1yil">1 Yıl</option>
                            </select>
                          ) : (
                            c.duration==="6ay"?"6 Ay":"1 Yıl"
                          )}
                        </td>
                        <td>
                          {editingContract === c.id ? (
                            <div className="chips" style={{margin: 0}}>
                              {SCOPE_OPTIONS.map(opt=>{
                                const on = Array.isArray(contractEditData.scope) && contractEditData.scope.includes(opt);
                                return (
                                  <button key={opt}
                                    className={`chip ${on?"on":""}`}
                                    style={{fontSize: '11px', padding: '4px 8px'}}
                                    onClick={()=> setContractEditData(f=>{
                                      const currentScope = Array.isArray(f.scope) ? f.scope : [];
                                      const on2 = currentScope.includes(opt);
                                      return {...f, scope: on2 ? currentScope.filter(x=>x!==opt) : [...currentScope,opt]};
                                    })}
                                  >{opt}</button>
                                );
                              })}
                            </div>
                          ) : (
                            Array.isArray(c.scope)&&c.scope.length?c.scope.join(", "):"—"
                          )}
                        </td>
                        <td>
                          {editingContract === c.id ? (
                            <select 
                              className="interactive"
                              value={contractEditData.team || ''}
                              onChange={(e) => setContractEditData({...contractEditData, team: e.target.value})}
                              style={{width: '100%', margin: 0}}
                            >
                              <option value="">Seçin</option>
                              {TEAM_OPTIONS.map(t=><option key={t} value={t}>{t}</option>)}
                            </select>
                          ) : (
                            c.team
                          )}
                        </td>
                        <td>
                          {editingContract === c.id ? (
                            <select 
                              className="interactive"
                              value={contractEditData.owner || ''}
                              onChange={(e) => setContractEditData({...contractEditData, owner: e.target.value})}
                              style={{width: '100%', margin: 0}}
                            >
                              <option value="">Seçin</option>
                              {OWNER_OPTIONS.map(o=><option key={o} value={o}>{o}</option>)}
                            </select>
                          ) : (
                            c.owner
                          )}
                        </td>
                        <td>
                          {editingContract === c.id ? (
                            <input 
                              className="interactive"
                              type="date"
                              value={contractEditData.startDate || ''}
                              onChange={(e) => setContractEditData({...contractEditData, startDate: e.target.value})}
                              style={{width: '100%', margin: 0}}
                            />
                          ) : (
                            c.startDate ? new Date(c.startDate).toLocaleDateString('tr-TR') : '-'
                          )}
                        </td>
                        <td>
                          {editingContract === c.id ? (
                            <input 
                              className="interactive"
                              type="date"
                              value={contractEditData.endDate || ''}
                              onChange={(e) => setContractEditData({...contractEditData, endDate: e.target.value})}
                              style={{width: '100%', margin: 0}}
                            />
                          ) : (
                            c.endDate ? new Date(c.endDate).toLocaleDateString('tr-TR') : '-'
                          )}
                        </td>
                        <td className="right">
                          {editingContract === c.id ? (
                            <>
                              <button 
                                className="btn primary" 
                                onClick={() => saveContractEdit(c.id)}
                                style={{marginRight: '8px'}}
                              >
                                💾 Kaydet
                              </button>
                              <button 
                                className="btn" 
                                onClick={cancelContractEdit}
                              >
                                ❌ İptal
                              </button>
                            </>
                          ) : (
                            <>
                              <button 
                                className="btn glow-on-hover" 
                                onClick={() => startContractEdit(c)}
                                style={{marginRight: '8px'}}
                              >
                                ✏️ Düzenle
                              </button>
                              <button className="btn danger ghost" onClick={()=>deleteContract(c.id)}>🗑️ Sil</button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                    {contracts.length===0 && (
                      <tr><td colSpan={8} className="muted center">Kayıt yok</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {tab==="customers" && (
          <section className="card space-y glass float">


            <div className="grid two">
              <label className="field">
                <span className="label">🏢 Müşteri Adı</span>
                <input 
                  className="interactive"
                  value={custName} 
                  onChange={e=>setCustName(e.target.value)} 
                  placeholder="Örn. Viennalife"
                />
              </label>
              <label className="field">
                <span className="label">🟢 Durum</span>
                <select className="interactive" value={custStatus} onChange={e=>setCustStatus(e.target.value)}>
                  <option>Aktif</option>
                  <option>Pasif</option>
                </select>
              </label>
            </div>

            <div className="right">
              <button 
                className="btn" 
                onClick={syncExistingCustomers}
                style={{marginRight: '8px'}}
              >
                🔄 Senkronize Et
              </button>
              <button 
                className="btn export-btn" 
                onClick={exportToExcel}
                style={{marginRight: '8px'}}
              >
                <svg className="export-icon" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                </svg>
                Excel İndir
              </button>
              <button 
                className="btn glow-on-hover" 
                onClick={exportToGoogleCalendar}
                style={{marginRight: '8px'}}
              >
                📅 Google Takvim
              </button>
              <button 
                className="btn glow-on-hover" 
                onClick={()=>{setCustName("");setCustStatus("Aktif");}}
              >
                🗑️ Temizle
              </button>
              <button className="btn primary glow-on-hover" onClick={addCust}>
                ➕ Ekle
              </button>
            </div>

            <div className="table-wrap">
              <table>
                <thead><tr><th>Müşteri</th><th>Durum</th><th className="right">İşlem</th></tr></thead>
                <tbody>
                  {customers.map(m=>(
                    <tr key={m.id}>
                      <td>
                        {editingCustomer === m.id ? (
                          <input 
                            className="interactive"
                            value={editData.name || ''}
                            onChange={(e) => setEditData({...editData, name: e.target.value})}
                            style={{width: '100%', margin: 0}}
                            autoFocus
                          />
                        ) : (
                          <span 
                            className="customer-name-clickable"
                            onClick={() => openCustomerDetail(m)}
                          >
                            {m.name}
                          </span>
                        )}
                      </td>
                      <td>
                        {editingCustomer === m.id ? (
                          <select 
                            className="interactive"
                            value={editData.status || 'Aktif'}
                            onChange={(e) => setEditData({...editData, status: e.target.value})}
                            style={{width: '100%', margin: 0}}
                          >
                            <option>Aktif</option>
                            <option>Pasif</option>
                          </select>
                        ) : (
                          <span className={`status ${m.status==="Aktif"?"ok":"no"}`}>{m.status}</span>
                        )}
                      </td>
                      <td className="right">
                        {editingCustomer === m.id ? (
                          <>
                            <button 
                              className="btn primary" 
                              onClick={() => saveEdit(m.id)}
                              style={{marginRight: '8px'}}
                            >
                              💾 Kaydet
                            </button>
                            <button 
                              className="btn" 
                              onClick={cancelEdit}
                            >
                              ❌ İptal
                            </button>
                          </>
                        ) : (
                          <>
                            <button 
                              className="btn glow-on-hover" 
                              onClick={() => startEdit(m)}
                              style={{marginRight: '8px'}}
                            >
                              ✏️ Düzenle
                            </button>
                            <button 
                              className="btn danger ghost" 
                              onClick={() => deleteCust(m.id)}
                            >
                              🗑️ Sil
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                  {customers.length===0 && (
                    <tr><td colSpan={3} className="muted center">Kayıt yok</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {tab==="reports" && (
          <>
            <section className="card space-y glass float">
              <div className="quarter-summary">
                <div className="total-contracts">
                  <div className="total-badge">
                    <span className="total-count">{contracts.length}</span>
                    <span className="total-label">Toplam Sözleşme</span>
                  </div>
                </div>
                
                <div className="quarters-grid">
                  {['Q1', 'Q2', 'Q3', 'Q4'].map(quarter => {
                    const quarterContracts = getQuarterContracts(quarter);
                    return (
                      <div key={quarter} className="quarter-card">
                        <div className="quarter-header">
                          <div className="quarter-badge">{quarter}</div>
                          <div className="quarter-count">{quarterContracts.length}</div>
                        </div>
                        <div className="quarter-period">{getQuarterPeriod(quarter)}</div>
                        <div className="quarter-details-permanent">
                          {quarterContracts.map(c => (
                            <div key={c.id} className="quarter-contract-item-permanent">
                              <span>{c.name}</span>
                              <span className="quarter-date">{c.endDate ? new Date(c.endDate).toLocaleDateString('tr-TR', {month: 'short'}) + "'" + new Date(c.endDate).getFullYear().toString().slice(-2) : '-'}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            <section className="card space-y glass float">
              <div className="text-center">
                <h2 className="subtitle gradient-text">📊 Kapsam Raporları</h2>
              </div>

            <div className="grid two">
              {SCOPE_OPTIONS.map(scope => {
                const scopeContracts = contracts.filter(c => 
                  Array.isArray(c.scope) && c.scope.includes(scope)
                );
                return (
                  <div key={scope} className="card glass">
                    <div className="scope-report-header">
                      <div className="scope-badge">{scope}</div>
                      <div className="scope-count">{scopeContracts.length}</div>
                    </div>
                    <div className="scope-contracts">
                      {scopeContracts.length === 0 ? (
                        <div className="muted">Kayıt yok</div>
                      ) : (
                        scopeContracts.map(c => (
                          <div key={c.id} className="scope-contract-item">
                            <span>{c.name}</span>
                            <span className="muted">{c.team}</span>
                          </div>
                        ))
                      )}
                    </div>
                    {scopeContracts.length > 0 && (
                      <button 
                        className="btn primary export-btn" 
                        onClick={() => exportScopeReport(scope, scopeContracts)}
                      >
                        <svg className="export-icon" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                        </svg>
                        Excel İndir
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="right">
              <button 
                className="btn primary export-btn" 
                onClick={exportAllScopesReport}
              >
                <svg className="export-icon" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                </svg>
                Tüm Raporları İndir
              </button>
            </div>
            </section>
          </>
        )}



        {tab==="revenue" && (
          <>
            <section className="card space-y glass float">
              <div className="text-center">
                <h2 className="subtitle gradient-text">💰 Müşteri Sözleşme Geçmişi</h2>
              </div>

              <div className="grid two">
                <label className="field">
                  <span className="label">🏢 Müşteri Seçin</span>
                  <select className="interactive" value={revenueForm.customerId} onChange={e=>setRevenueForm({...revenueForm, customerId: e.target.value})}>
                    <option value="">Müşteri Seçin</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </label>
                <label className="field">
                  <span className="label">📅 Yıl</span>
                  <input 
                    className="interactive"
                    type="number" 
                    value={revenueForm.year}
                    onChange={e=>setRevenueForm({...revenueForm, year: e.target.value})}
                    placeholder="Örn: 2024"
                    style={{fontSize: '16px', padding: '12px'}}
                  />
                </label>
              </div>

              <div className="grid two">
                <label className="field">
                  <span className="label">💰 Tutar</span>
                  <input 
                    className="interactive"
                    type="number" 
                    value={revenueForm.amount}
                    onChange={e=>setRevenueForm({...revenueForm, amount: e.target.value})}
                    placeholder="Örn: 150000"
                    step="1000"
                  />
                </label>
                <label className="field">
                  <span className="label">💵 Para Birimi</span>
                  <select className="interactive" value={revenueForm.currency} onChange={e=>setRevenueForm({...revenueForm, currency: e.target.value})}>
                    <option value="TL">TL</option>
                    <option value="USD">USD</option>
                  </select>
                </label>
              </div>

              <div className="right">
                <button 
                  className="btn glow-on-hover" 
                  onClick={()=>setRevenueForm({customerId: '', year: new Date().getFullYear(), amount: '', currency: 'TL'})}
                >
                  🗑️ Temizle
                </button>
                <button className="btn primary glow-on-hover" onClick={addRevenueRecord}>
                  💾 Kaydet
                </button>
              </div>
            </section>

            <section className="card glass">
              <div className="table-header-badge">
                📈 MÜŞTERİ SÖZLEŞME ANALİZİ
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Müşteri</th><th>Son Yıl</th><th>Büyüme</th><th>Detay</th><th>Düzenle</th><th>İşlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customersWithRevenue
                      .sort((a, b) => {
                        // Aktif müşteriler üstte, pasif müşteriler altta
                        if (a.status === 'Aktif' && b.status === 'Pasif') return -1;
                        if (a.status === 'Pasif' && b.status === 'Aktif') return 1;
                        return 0;
                      })
                      .map(customer => (
                      <tr key={customer.id} style={{
                        opacity: customer.status === 'Pasif' ? 0.6 : 1,
                        background: customer.status === 'Pasif' ? 'rgba(239,68,68,0.05)' : 'transparent'
                      }}>
                        <td style={{
                          fontWeight: '600',
                          color: customer.status === 'Pasif' ? 'var(--muted)' : 'var(--txt)'
                        }}>
                          {customer.name}
                        </td>

                        <td style={{
                          color: customer.status === 'Pasif' ? 'var(--muted)' : 'var(--txt)'
                        }}>
                          {editingMainRevenue === customer.id ? (
                            <div style={{display: 'flex', gap: '4px', alignItems: 'center'}}>
                              <input 
                                className="interactive"
                                type="number"
                                value={mainRevenueEditData.amount || ''}
                                onChange={(e) => setMainRevenueEditData({...mainRevenueEditData, amount: e.target.value})}
                                style={{width: '80px', margin: 0, padding: '4px 8px', fontSize: '12px'}}
                                step="1000"
                              />
                              <select 
                                className="interactive"
                                value={mainRevenueEditData.currency || 'TL'}
                                onChange={(e) => setMainRevenueEditData({...mainRevenueEditData, currency: e.target.value})}
                                style={{width: '60px', margin: 0, padding: '4px 8px', fontSize: '12px'}}
                              >
                                <option value="TL">TL</option>
                                <option value="USD">USD</option>
                              </select>
                            </div>
                          ) : (
                            `${customer.lastYearAmount.toLocaleString('tr-TR')} ${customer.lastYearCurrency || 'TL'}`
                          )}
                        </td>
                        <td>
                          {customer.growth !== null ? (
                            <span className={`pill ${customer.growth >= 0 ? 'success' : 'danger'}`} style={{
                              opacity: customer.status === 'Pasif' ? 0.5 : 1
                            }}>
                              {customer.growth >= 0 ? '↑' : '↓'} {Math.abs(customer.growth).toFixed(1)}%
                            </span>
                          ) : (
                            <span className="muted">-</span>
                          )}
                        </td>
                        <td>
                          <button 
                            className="btn glow-on-hover" 
                            onClick={() => setSelectedRevenueCustomer(customer)}
                            style={{
                              padding: '6px 12px', 
                              fontSize: '12px',
                              opacity: customer.status === 'Pasif' ? 0.7 : 1
                            }}
                          >
                            📈 Detay
                          </button>
                        </td>
                        <td>
                          {customer.revenue.length > 0 && (
                            editingMainRevenue === customer.id ? (
                              <div style={{display: 'flex', gap: '4px'}}>
                                <button 
                                  className="btn primary" 
                                  onClick={saveMainRevenueEdit}
                                  style={{padding: '6px 12px', fontSize: '12px'}}
                                >
                                  ✓ Kaydet
                                </button>
                                <button 
                                  className="btn" 
                                  onClick={cancelMainRevenueEdit}
                                  style={{padding: '6px 12px', fontSize: '12px'}}
                                >
                                  ✕ İptal
                                </button>
                              </div>
                            ) : (
                              <button 
                                className="btn glow-on-hover" 
                                onClick={() => startMainRevenueEdit(customer.id)}
                                style={{
                                  padding: '6px 12px', 
                                  fontSize: '12px',
                                  opacity: customer.status === 'Pasif' ? 0.7 : 1
                                }}
                              >
                                ✏️ Düzenle
                              </button>
                            )
                          )}
                        </td>
                        <td>
                          <button 
                            className="btn danger ghost" 
                            onClick={() => {
                              const customerRecords = revenueHistory.filter(r => r.customerId === customer.id);
                              if (customerRecords.length > 0 && confirm(`${customer.name} için tüm kayıtları silmek istiyor musunuz?`)) {
                                setRevenueHistory(prev => prev.filter(r => r.customerId !== customer.id));
                              }
                            }}
                            style={{
                              padding: '6px 12px', 
                              fontSize: '12px',
                              opacity: customer.status === 'Pasif' ? 0.7 : 1
                            }}
                          >
                            🗑️ Sil
                          </button>
                        </td>
                      </tr>
                    ))}
                    {customersWithRevenue.filter(c => c.revenue.length > 0).length === 0 && (
                      <tr><td colSpan={6} className="muted center">Henüz sözleşme kaydı yok</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </main>

      {/* Gelir Detay Popup */}
      {selectedRevenueCustomer && (
        <div className="modal-overlay" onClick={() => setSelectedRevenueCustomer(null)}>
          <div className="customer-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>💰 {selectedRevenueCustomer.name} - Sözleşme Geçmişi</h2>
              <button className="close-btn" onClick={() => setSelectedRevenueCustomer(null)}>✕</button>
            </div>
            
            <div className="customer-info">
              <div className="info-item">
                <span className="info-label">📈 Büyüme:</span>
                <span>
                  {selectedRevenueCustomer.growth !== null ? (
                    <span className={`status ${selectedRevenueCustomer.growth >= 0 ? 'ok' : 'no'}`}>
                      {selectedRevenueCustomer.growth >= 0 ? '↑' : '↓'} {Math.abs(selectedRevenueCustomer.growth).toFixed(1)}%
                    </span>
                  ) : (
                    <span className="muted">Veri yok</span>
                  )}
                </span>
              </div>
            </div>

            <div className="contracts-section">
              <h3 style={{marginBottom: '1rem', color: 'var(--primary)'}}>📅 Yıllık Sözleşme Detayı</h3>
              {selectedRevenueCustomer.revenue.length === 0 ? (
                <div className="no-contracts">
                  💭 Bu müşteriye ait sözleşme kaydı bulunamadı
                </div>
              ) : (
                <div className="contracts-grid">
                  {selectedRevenueCustomer.revenue
                    .slice()
                    .sort((a, b) => b.year - a.year)
                    .map((record) => {
                    const sortedRevenue = selectedRevenueCustomer.revenue.slice().sort((a, b) => a.year - b.year);
                    const recordIndex = sortedRevenue.findIndex(r => r.id === record.id);
                    const previousRecord = recordIndex > 0 ? sortedRevenue[recordIndex - 1] : null;
                    const growth = previousRecord ? calculateGrowth(record.amount, previousRecord.amount) : null;
                    
                    return (
                      <div key={record.id} className="contract-card-mini">
                        <div className="contract-name" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                          {editingRevenue === record.id ? (
                            <input 
                              className="interactive"
                              type="number"
                              value={revenueEditData.year || ''}
                              onChange={(e) => setRevenueEditData({...revenueEditData, year: e.target.value})}
                              style={{width: '80px', margin: 0, padding: '4px 8px', fontSize: '12px'}}
                              placeholder="Yıl"
                            />
                          ) : (
                            <span>📅 {record.year}</span>
                          )}
                          <div style={{display: 'flex', gap: '4px'}}>
                            {editingRevenue === record.id ? (
                              <>
                                <button 
                                  className="btn primary" 
                                  onClick={() => saveRevenueEdit(record.id)}
                                  style={{padding: '4px 8px', fontSize: '10px'}}
                                >
                                  ✓
                                </button>
                                <button 
                                  className="btn" 
                                  onClick={cancelRevenueEdit}
                                  style={{padding: '4px 8px', fontSize: '10px'}}
                                >
                                  ✕
                                </button>
                              </>
                            ) : (
                              <>
                                <button 
                                  className="btn glow-on-hover" 
                                  onClick={() => startRevenueEdit(record)}
                                  style={{padding: '4px 8px', fontSize: '10px'}}
                                >
                                  ✏️
                                </button>
                                <button 
                                  className="btn danger ghost" 
                                  onClick={() => deleteRevenueRecord(record.id)}
                                  style={{padding: '4px 8px', fontSize: '10px'}}
                                >
                                  ✕
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                        <div style={{fontSize: '1.5rem', fontWeight: '700', color: 'var(--green)', margin: '0.5rem 0'}}>
                          {editingRevenue === record.id ? (
                            <div style={{display: 'flex', gap: '4px', alignItems: 'center'}}>
                              <input 
                                className="interactive"
                                type="number"
                                value={revenueEditData.amount || ''}
                                onChange={(e) => setRevenueEditData({...revenueEditData, amount: e.target.value})}
                                style={{width: '100px', margin: 0, padding: '4px 8px', fontSize: '14px', fontWeight: '700'}}
                                step="1000"
                              />
                              <select 
                                className="interactive"
                                value={revenueEditData.currency || 'TL'}
                                onChange={(e) => setRevenueEditData({...revenueEditData, currency: e.target.value})}
                                style={{width: '60px', margin: 0, padding: '4px 8px', fontSize: '12px'}}
                              >
                                <option value="TL">TL</option>
                                <option value="USD">USD</option>
                              </select>
                            </div>
                          ) : (
                            `${record.amount.toLocaleString('tr-TR')} ${record.currency || 'TL'}`
                          )}
                        </div>
                        {growth !== null && (
                          <div style={{fontSize: '0.875rem'}}>
                            <span className={`status ${growth >= 0 ? 'ok' : 'no'}`}>
                              {growth >= 0 ? '↑' : '↓'} {Math.abs(growth).toFixed(1)}% 
                              ({growth >= 0 ? 'Artış' : 'Azalış'})
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Müşteri Detay Popup */}
      {selectedCustomer && (
        <div className="modal-overlay" onClick={closeCustomerDetail}>
          <div className="customer-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🏢 {selectedCustomer.name}</h2>
              <button className="close-btn" onClick={closeCustomerDetail}>✕</button>
            </div>
            
            <div className="customer-info">
              <div className="info-item">
                <span className="info-label">🟢 Durum:</span>
                <span className={`status ${selectedCustomer.status === 'Aktif' ? 'ok' : 'no'}`}>
                  {selectedCustomer.status}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">📅 Kayıt Tarihi:</span>
                <span>{selectedCustomer.createdAt ? new Date(selectedCustomer.createdAt).toLocaleDateString('tr-TR') : '-'}</span>
              </div>
            </div>

            <div className="contracts-section">
              {customerContracts.length === 0 ? (
                <div className="no-contracts">
                  💭 Bu müşteriye ait sözleşme bulunamadı
                </div>
              ) : (
                <div className="contracts-grid">
                  {customerContracts.map(contract => (
                    <div key={contract.id} className="contract-card-mini">
                      <div className="contract-name">{contract.name}</div>
                      <div className="contract-details">
                        <span className="detail-item">💼 {contract.team}</span>
                        <span className="detail-item">👤 {contract.owner}</span>
                        <span className="detail-item">⏰ {contract.duration === '6ay' ? '6 Ay' : '1 Yıl'}</span>
                        <span className="detail-item">🏁 {contract.endDate ? new Date(contract.endDate).toLocaleDateString('tr-TR') : '-'}</span>
                      </div>
                      {Array.isArray(contract.scope) && contract.scope.length > 0 && (
                        <div className="contract-scope">
                          {contract.scope.map(s => (
                            <span key={s} className="scope-tag">{s}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}