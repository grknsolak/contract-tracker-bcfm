import React, { useEffect, useMemo, useRef, useState } from "react";
import { logout, listContracts, addContract, updateContract, removeContract, listCustomers, addCustomer, updateCustomer, removeCustomer, syncCustomers, listCustomerNotes, addCustomerNote, listRevenue, addRevenue, updateRevenue, removeRevenue } from "./api";

const TEAM_OPTIONS  = ["Team B", "Mando", "Solid", "Şisecam", "Atlas", "Apex"];
const OWNER_OPTIONS = ["Onur", "Döndü", "Gürkan"];
const SCOPE_OPTIONS = ["DaaS", "7/24 Support", "Man/Day", "Outsource", "Fix", "AWS Resell"];
const RENEWAL_STATUS_OPTIONS = ["Takipte", "Teklif Gönderildi", "Müzakerede", "İmza Aşamasında", "Yenilendi", "Kaybedildi"];

function formatDateISO(d){ return new Date(d).toISOString().slice(0,10); }
function addMonths(dateStr, m){ const d=new Date(dateStr); d.setMonth(d.getMonth()+m); return formatDateISO(d); }
function addYears(dateStr, y){ const d=new Date(dateStr); d.setFullYear(d.getFullYear()+y); return formatDateISO(d); }
function addDays(dateStr, n){ const d=new Date(dateStr); d.setDate(d.getDate()+n); return formatDateISO(d); }
function daysLeft(endISO){ if(!endISO) return null; const end=new Date(endISO), today=new Date(); return Math.ceil((end - today)/(1000*60*60*24)); }
function getStartDate(c){ return c?.startDate || c?.start_date || ""; }
function getEndDate(c){ return c?.endDate || c?.end_date || ""; }
function getRenewalStatus(c){ return c?.renewalStatus || c?.renewal_status || "Takipte"; }
function customerStatusLamp(status){ return status === "Aktif" ? "🟢" : "🔴"; }
function formatDateTR(iso){
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return "";
  return `${d}.${m}.${y}`;
}
function formatMoney(n){
  const v = Number(n);
  if (Number.isNaN(v)) return null;
  return v.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}
function normalizeMoneyInput(value){
  return String(value ?? "").replace(/[^\d]/g, "");
}
function formatMoneyInput(value){
  const digits = normalizeMoneyInput(value);
  if (!digits) return "";
  return Number(digits).toLocaleString('tr-TR');
}

export default function ContractApp({ user, setUser }) {
  const [tab, setTab] = useState("new");
  const [contracts, setContracts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const startDatePickerRef = useRef(null);

  const [form, setForm] = useState({
    name:"", duration:"", scope:[], scopePrices:{}, team:"", owner:"", startDate:"", endDate:""
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
      const contractCustomerName = form.name.trim();
      const { data } = await addContract(form);
      setContracts(prev=>[data, ...prev]);
      try {
        await addCustomer(contractCustomerName, "Aktif");
        const customerRes = await listCustomers();
        setCustomers(customerRes.data || []);
      } catch (e) {
        if (e?.response?.status !== 409) {
          console.error("Müşteri senkronizasyon hatası:", e);
        }
      }
      setForm({name:"",duration:"",scope:[],scopePrices:{},team:"",owner:"",startDate:"",endDate:""});
      setTab("contracts");
    }catch(e){ alert(e?.response?.data?.error || "Kayıt başarısız"); }
  };

  const openStartDatePicker = () => {
    const picker = startDatePickerRef.current;
    if (!picker) return;
    if (typeof picker.showPicker === "function") {
      picker.showPicker();
      return;
    }
    picker.focus();
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
  const [notesModalCustomer, setNotesModalCustomer] = useState(null);
  const [customerNotes, setCustomerNotes] = useState([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [notesSaving, setNotesSaving] = useState(false);
  const [renewalModalContract, setRenewalModalContract] = useState(null);
  const [renewalStatusDraft, setRenewalStatusDraft] = useState("Takipte");
  const [revenueHistory, setRevenueHistory] = useState([]);
  const [revenueForm, setRevenueForm] = useState({
    customerId: '', year: new Date().getFullYear(), amount: '', currency: 'TL'
  });
  
  const addCust = async ()=>{
    if(!custName.trim()) return;
    try{
      const { data } = await addCustomer(custName.trim(), custStatus);
      setCustomers(prev=>[data, ...prev]); setCustName(""); setCustStatus("Aktif");
      setTab("contracts");
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
          getStartDate(c) ? new Date(getStartDate(c)).toLocaleDateString('tr-TR') : '-',
          getEndDate(c) ? new Date(getEndDate(c)).toLocaleDateString('tr-TR') : '-',
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
      if (!getEndDate(c)) return false;
      const endDate = new Date(getEndDate(c));
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
              getStartDate(c) ? new Date(getStartDate(c)).toLocaleDateString('tr-TR') : '-',
              getEndDate(c) ? new Date(getEndDate(c)).toLocaleDateString('tr-TR') : '-',
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
      if (!getEndDate(contract)) continue;
      
      const endDate = new Date(getEndDate(contract));
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
          (c.createdAt || c.created_at) ? new Date(c.createdAt || c.created_at).toLocaleDateString('tr-TR') : '-'
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
      scopePrices: contract.scopePrices || contract.scope_prices || {},
      team: contract.team,
      owner: contract.owner,
      startDate: getStartDate(contract),
      endDate: getEndDate(contract)
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

  const customerRows = useMemo(() => {
    return customers.map((customer) => {
      const name = (customer.name || "").trim().toLowerCase();
      const relatedContracts = contracts.filter((c) => (c.name || "").trim().toLowerCase() === name);
      const createdAt = customer.createdAt || customer.created_at;
      const teams = [...new Set(relatedContracts.map((c) => c.team).filter(Boolean))];
      const owners = [...new Set(relatedContracts.map((c) => c.owner).filter(Boolean))];
      const totalScopeAmount = relatedContracts.reduce((sum, contract) => {
        const prices = contract.scopePrices || contract.scope_prices || {};
        const contractTotal = Object.values(prices).reduce((s, v) => {
          const n = Number(v);
          return Number.isNaN(n) ? s : s + n;
        }, 0);
        return sum + contractTotal;
      }, 0);
      const nearestDays = relatedContracts.reduce((min, c) => {
        const d = daysLeft(getEndDate(c));
        if (d == null) return min;
        if (min == null) return d;
        return Math.min(min, d);
      }, null);
      const latestContract = relatedContracts
        .slice()
        .sort((a, b) => new Date(getEndDate(b) || 0) - new Date(getEndDate(a) || 0))[0];
      const lastRenewalStatus = latestContract ? getRenewalStatus(latestContract) : "-";

      return { customer, createdAt, relatedContracts, nearestDays, teams, owners, totalScopeAmount, lastRenewalStatus };
    });
  }, [customers, contracts]);

  const expiringIn60 = useMemo(() => {
    return contracts
      .filter((c) => {
        const d = daysLeft(getEndDate(c));
        return d != null && d >= 0 && d <= 60;
      })
      .sort((a, b) => daysLeft(getEndDate(a)) - daysLeft(getEndDate(b)));
  }, [contracts]);

  const openRenewalStatusModal = (contract) => {
    setRenewalModalContract(contract);
    setRenewalStatusDraft(getRenewalStatus(contract));
  };

  const saveRenewalStatus = async () => {
    if (!renewalModalContract) return;
    try {
      let nextStartDate = getStartDate(renewalModalContract);
      let nextEndDate = getEndDate(renewalModalContract);

      if (renewalStatusDraft === "Yenilendi") {
        const baseEndDate = getEndDate(renewalModalContract) || formatDateISO(new Date());
        nextStartDate = addDays(baseEndDate, 1);
        nextEndDate = renewalModalContract.duration === "6ay"
          ? addMonths(nextStartDate, 6)
          : addYears(nextStartDate, 1);
      }

      const payload = {
        name: renewalModalContract.name,
        duration: renewalModalContract.duration,
        scope: renewalModalContract.scope || [],
        scopePrices: renewalModalContract.scopePrices || renewalModalContract.scope_prices || {},
        team: renewalModalContract.team,
        owner: renewalModalContract.owner,
        startDate: nextStartDate,
        endDate: nextEndDate,
        renewalStatus: renewalStatusDraft
      };
      const { data } = await updateContract(renewalModalContract.id, payload);
      setContracts(prev => prev.map(c => c.id === renewalModalContract.id ? data : c));
      setRenewalModalContract(null);
    } catch (e) {
      alert(e?.response?.data?.error || "Durum güncellenemedi");
    }
  };

  const openNotesModal = async (customer) => {
    setNotesModalCustomer(customer);
    setNoteDraft("");
    setNotesLoading(true);
    try {
      const { data } = await listCustomerNotes(customer.id);
      setCustomerNotes(data || []);
    } catch (e) {
      setCustomerNotes([]);
      alert("Müşteri notları yüklenemedi");
    } finally {
      setNotesLoading(false);
    }
  };

  const saveCustomerNoteHistory = async () => {
    if (!notesModalCustomer || !noteDraft.trim()) return;
    setNotesSaving(true);
    try {
      const { data } = await addCustomerNote(notesModalCustomer.id, noteDraft.trim());
      setCustomerNotes((prev) => [data, ...prev]);
      setNoteDraft("");
    } catch (e) {
      alert(e?.response?.data?.error || "Not kaydedilemedi");
    } finally {
      setNotesSaving(false);
    }
  };

  const soon30 = useMemo(()=> contracts.filter(c => {
    const d=daysLeft(getEndDate(c)); return d!=null && d<=30;
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

  const soon60 = useMemo(()=> contracts.filter(c => {
    const d=daysLeft(getEndDate(c)); return d!=null && d>30 && d<=60;
  }), [contracts]);

  const expired = useMemo(()=> contracts.filter(c => {
    const d=daysLeft(getEndDate(c)); return d!=null && d<=0;
  }), [contracts]);

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
          <button className={`tab ${tab==="contracts"?"active":""}`} onClick={()=>setTab("contracts")}>
            📋 Sözleşmeler
          </button>
          <button className={`tab ${tab==="reports"?"active":""}`} onClick={()=>setTab("reports")}>
            📈 Raporlar
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
                        const nextScope = on2 ? f.scope.filter(x=>x!==opt) : [...f.scope,opt];
                        const nextPrices = { ...(f.scopePrices || {}) };
                        if (on2) delete nextPrices[opt];
                        return {...f, scope: nextScope, scopePrices: nextPrices};
                      })}
                    >{opt}</button>
                  );
                })}
              </div>
            </div>

            {form.scope.length > 0 && (
              <div className="grid two">
                {form.scope.map(scopeName => (
                  <label className="field" key={scopeName}>
                    <span className="label">💰 {scopeName} Fiyatı (TL)</span>
                    <input
                      className="interactive"
                      type="text"
                      inputMode="numeric"
                      value={formatMoneyInput(form.scopePrices?.[scopeName] ?? "")}
                      onChange={(e) => setForm(f => ({
                        ...f,
                        scopePrices: {
                          ...(f.scopePrices || {}),
                          [scopeName]: normalizeMoneyInput(e.target.value)
                        }
                      }))}
                      placeholder="0"
                    />
                  </label>
                ))}
              </div>
            )}

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
                <div className="date-field-shell" onClick={openStartDatePicker}>
                  <input
                    className="interactive"
                    type="text"
                    readOnly
                    placeholder="GG.AA.YYYY"
                    value={formatDateTR(form.startDate)}
                  />
                  <input
                    ref={startDatePickerRef}
                    type="date"
                    className="date-picker-native"
                    value={form.startDate}
                    onChange={e=>setForm({...form,startDate:e.target.value})}
                  />
                </div>
              </label>
              <label className="field">
                <span className="label">📅 Bitiş Tarihi</span>
                <input 
                  className="interactive"
                  type="text"
                  value={formatDateTR(form.endDate)}
                  readOnly
                  style={{opacity: 0.8}}
                />
              </label>
            </div>

            <div className="right">
              <button 
                className="btn glow-on-hover" 
                onClick={()=>{
                  setForm({name:"",duration:"",scope:[],scopePrices:{},team:"",owner:"",startDate:"",endDate:""});
                }}
              >
                🗑️ Temizle
              </button>
              <button className="btn primary glow-on-hover" onClick={saveContract}>
                💾 Kaydet
              </button>
            </div>
          </section>
        )}

        {tab==="contracts" && (
          <>
            <section className="card space-y glass float">
              <h2 className="subtitle gradient-text">📋 Müşteri Detay Listesi</h2>
              {customerRows.length === 0 ? (
                <div className="muted">Kayıtlı müşteri yok</div>
              ) : (
                <div className="customer-list-compact">
                  <div className="customer-list-head">
                    <span>Müşteri</span>
                    <span>Durum</span>
                    <span>Sözleşme</span>
                    <span>Takım / Sahip</span>
                    <span>Toplam Kapsam</span>
                    <span>Son Durum</span>
                    <span>En Yakın Bitiş</span>
                    <span>Notlar</span>
                  </div>
                  {customerRows.map(({ customer, createdAt, relatedContracts, nearestDays, teams, owners, totalScopeAmount, lastRenewalStatus }) => (
                    <div key={customer.id} className="customer-list-row">
                      <span>{customerStatusLamp(customer.status)} {customer.name}</span>
                      <span className={`pill ${customer.status === "Aktif" ? "success" : "danger"}`}>{customer.status}</span>
                      <span>{relatedContracts.length} adet</span>
                      <span title={`Takım: ${teams.length ? teams.join(", ") : "-"} | Sahip: ${owners.length ? owners.join(", ") : "-"}`}>
                        {teams.length ? teams.join(", ") : "-"} / {owners.length ? owners.join(", ") : "-"}
                      </span>
                      <span>{totalScopeAmount > 0 ? `${formatMoney(totalScopeAmount)} TL` : "-"}</span>
                      <span>{lastRenewalStatus}</span>
                      <span>
                        {nearestDays == null ? "Bitiş tarihi yok" : `${nearestDays} gün`} • {createdAt ? new Date(createdAt).toLocaleDateString('tr-TR') : "-"}
                      </span>
                      <span>
                        <button className="btn glow-on-hover" onClick={() => openNotesModal(customer)}>
                          Notlar
                        </button>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="card space-y glass float">
              <h2 className="subtitle gradient-text">⏰ 60 Gün İçinde Bitenler (Manuel Durum)</h2>
              {expiringIn60.length === 0 ? (
                <div className="muted">Önümüzdeki 60 gün içinde bitecek sözleşme yok</div>
              ) : (
                expiringIn60.map((c) => (
                  <div key={c.id} className="row-pill">
                    <span>{c.name}</span>
                    <span className="muted">{formatDateTR(getEndDate(c))}</span>
                    <span className="pill warning">{daysLeft(getEndDate(c))} gün</span>
                    <span className="pill">{getRenewalStatus(c)}</span>
                    <button className="btn glow-on-hover" onClick={() => openRenewalStatusModal(c)}>
                      Durum Güncelle
                    </button>
                  </div>
                ))
              )}
            </section>
          </>
        )}

        {tab==="reports" && (
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
                      <span className="pill critical">{daysLeft(getEndDate(c))} gün</span>
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
                      <span className="pill warning">{daysLeft(getEndDate(c))} gün</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="card glass float" style={{marginTop: '1rem'}}>
              <div className="alert-header">
                <div className="badge" style={{background: '#dc2626'}}>❌ SÜRESİ GEÇMİŞ</div>
              </div>
              {expired.length===0 ? (
                <div className="muted">Kayıt yok</div>
              ) : (
                expired.map(c=>(
                  <div key={c.id} className="row-pill">
                    <span>{c.name}</span>
                    <span className="pill" style={{background: '#dc2626', color: 'white'}}>{Math.abs(daysLeft(getEndDate(c)))} gün önce</span>
                  </div>
                ))
              )}
            </div>

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
                              <span className="quarter-date">{getEndDate(c) ? new Date(getEndDate(c)).toLocaleDateString('tr-TR', {month: 'short'}) + "'" + new Date(getEndDate(c)).getFullYear().toString().slice(-2) : '-'}</span>
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

      </main>

      {/* Gelir Detay Popup */}
      {renewalModalContract && (
        <div className="modal-overlay" onClick={() => setRenewalModalContract(null)}>
          <div className="customer-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📝 Durum Güncelle: {renewalModalContract.name}</h2>
              <button className="close-btn" onClick={() => setRenewalModalContract(null)}>✕</button>
            </div>
            <div className="space-y">
              <label className="field">
                <span className="label">Yenileme Durumu</span>
                <select
                  className="interactive"
                  value={renewalStatusDraft}
                  onChange={(e) => setRenewalStatusDraft(e.target.value)}
                >
                  {RENEWAL_STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </label>
              <div className="right">
                <button className="btn glow-on-hover" onClick={() => setRenewalModalContract(null)}>Vazgeç</button>
                <button className="btn primary glow-on-hover" onClick={saveRenewalStatus}>Kaydet</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Gelir Detay Popup */}
      {notesModalCustomer && (
        <div className="modal-overlay" onClick={() => setNotesModalCustomer(null)}>
          <div className="customer-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🗒️ {notesModalCustomer.name} - Not Geçmişi</h2>
              <button className="close-btn" onClick={() => setNotesModalCustomer(null)}>✕</button>
            </div>

            <div className="space-y">
              <label className="field">
                <span className="label">Yeni Not</span>
                <textarea
                  className="interactive note-textarea"
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  placeholder="Müşteri için not girin..."
                />
              </label>
              <div className="right">
                <button
                  className="btn primary glow-on-hover"
                  onClick={saveCustomerNoteHistory}
                  disabled={notesSaving}
                >
                  {notesSaving ? "Kaydediliyor..." : "Not Ekle"}
                </button>
              </div>

              <div className="notes-history">
                {notesLoading ? (
                  <div className="muted">Notlar yükleniyor...</div>
                ) : customerNotes.length === 0 ? (
                  <div className="muted">Henüz not yok</div>
                ) : (
                  customerNotes.map((note) => (
                    <div key={note.id} className="note-item">
                      <div className="note-item-meta">
                        <span>{note.created_by_email || "Kullanıcı"}</span>
                        <span>{new Date(note.created_at).toLocaleString('tr-TR')}</span>
                      </div>
                      <div>{note.note}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

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
              <h2>{customerStatusLamp(selectedCustomer.status)} {selectedCustomer.name}</h2>
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
                <span>{(selectedCustomer.createdAt || selectedCustomer.created_at) ? new Date(selectedCustomer.createdAt || selectedCustomer.created_at).toLocaleDateString('tr-TR') : '-'}</span>
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
                        <span className="detail-item">🏁 {getEndDate(contract) ? new Date(getEndDate(contract)).toLocaleDateString('tr-TR') : '-'}</span>
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
