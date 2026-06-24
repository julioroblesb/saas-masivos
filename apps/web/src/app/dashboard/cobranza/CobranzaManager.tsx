'use client';
import { useState } from 'react';
import { Coins, XCircle, Search, Calendar, User, Phone } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { addPaymentAction } from '../atenciones/actions';
import { CustomSelect } from '@/components/ui/CustomSelect';

export default function CobranzaManager({ debts }: { debts: any[] }) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentVisit, setPaymentVisit] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('efectivo');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredDebts = debts.filter(d => 
    d.contact_name?.toLowerCase().includes(search.toLowerCase()) || 
    d.service_name?.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddPayment = async () => {
    if (!paymentVisit || paymentAmount <= 0) return;
    setIsSubmitting(true);
    const res = await addPaymentAction(paymentVisit.id, paymentAmount, paymentMethod);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success('Abono registrado exitosamente');
      setIsPaymentModalOpen(false);
      router.refresh();
    }
    setIsSubmitting(false);
  };

  const totalDebt = debts.reduce((sum, d) => sum + (d.price_charged - d.amount_paid), 0);

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="rounded-3xl bg-danger text-white border border-danger shadow-sm p-6 relative overflow-hidden group">
          <div className="flex justify-between items-start relative z-10">
            <div className="flex flex-col space-y-1">
              <p className="text-white/80 text-xs font-semibold uppercase tracking-widest">Deuda Total</p>
              <h2 className="text-4xl font-bold tracking-tight mt-2">S/ {totalDebt}</h2>
            </div>
            <div className="p-3 bg-white/20 rounded-xl">
              <Coins className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4" />
          <input 
            type="text" 
            placeholder="Buscar por paciente..." 
            className="form-input pl-10 rounded-xl border-black-light dark:border-dark-light focus:ring-primary focus:border-primary transition-shadow w-full bg-white dark:bg-dark"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="panel p-0 overflow-hidden">
        <div className="table-responsive">
          {filteredDebts.length === 0 ? (
            <div className="p-8 text-center text-zinc-500">No hay deudas pendientes.</div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-sm font-semibold text-zinc-600 dark:text-zinc-300">
                <tr>
                  <th className="p-4">Paciente</th>
                  <th className="p-4">Servicio</th>
                  <th className="p-4">Deuda</th>
                  <th className="p-4">Fecha Promesa</th>
                  <th className="p-4">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {filteredDebts.map((debt: any) => {
                  const pending = debt.price_charged - debt.amount_paid;
                  const isExpired = debt.debt_due_date && new Date(debt.debt_due_date).getTime() < new Date().getTime();
                  return (
                    <tr key={debt.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                      <td className="p-4">
                        <div className="font-semibold text-black dark:text-white">{debt.contact_name || 'Sin Nombre'}</div>
                        <div className="text-xs text-zinc-500 flex items-center gap-1"><Phone size={12}/> +{debt.contact_phone}</div>
                      </td>
                      <td className="p-4 text-zinc-600 dark:text-zinc-300">
                        {debt.service_name}
                        <div className="text-xs text-zinc-400">Atendido el: {new Date(debt.scheduled_date || debt.visit_date).toLocaleDateString()}</div>
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-danger">S/ {pending}</div>
                        <div className="text-xs text-zinc-500">Total: S/ {debt.price_charged}</div>
                      </td>
                      <td className="p-4">
                        {debt.debt_due_date ? (
                          <span className={`badge ${isExpired ? 'bg-danger/10 text-danger' : 'bg-warning/10 text-warning'}`}>
                            {new Date(debt.debt_due_date).toLocaleDateString()} {isExpired && '(Vencido)'}
                          </span>
                        ) : (
                          <span className="text-zinc-400 text-sm">-</span>
                        )}
                      </td>
                      <td className="p-4">
                        <button 
                          onClick={() => {
                            setPaymentVisit(debt);
                            setPaymentAmount(pending);
                            setIsPaymentModalOpen(true);
                          }}
                          className="btn btn-sm btn-outline-primary bg-primary/5 hover:bg-primary hover:text-white"
                        >
                          Cobrar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal - Registrar Abono */}
      {isPaymentModalOpen && paymentVisit && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-dark border border-black-light dark:border-dark-light rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-2 duration-300">
            <div className="flex items-center justify-between p-6 border-b border-black-light dark:border-dark-light bg-gradient-to-r from-zinc-50 to-white dark:from-zinc-900/50 dark:to-dark">
              <h3 className="text-xl font-bold tracking-tight text-black dark:text-white flex items-center gap-2">
                <Coins className="w-5 h-5 text-primary" />
                Registrar Abono
              </h3>
              <button 
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-white transition-colors bg-white-light dark:bg-zinc-800 p-2 rounded-full" 
                onClick={() => setIsPaymentModalOpen(false)}
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="bg-primary/5 rounded-xl p-4 border border-primary/10">
                <div className="text-sm text-zinc-500 mb-1">Saldo pendiente</div>
                <div className="text-2xl font-bold text-primary">S/ {paymentVisit.price_charged - paymentVisit.amount_paid}</div>
              </div>

              <div className="space-y-4">
                <label className="text-sm font-semibold text-black dark:text-white flex items-center gap-2">
                  <Coins className="w-4 h-4 text-primary" /> Monto a abonar
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-medium">S/</span>
                  <input 
                    type="number"
                    className="form-input pl-8 w-full rounded-xl border-black-light dark:border-dark-light focus:border-primary focus:ring-primary shadow-sm bg-white dark:bg-dark"
                    value={paymentAmount}
                    onChange={e => setPaymentAmount(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-sm font-semibold text-black dark:text-white flex items-center gap-2">
                  <Coins className="w-4 h-4 text-primary" /> Método de Pago
                </label>
                <CustomSelect
                  options={[
                    { value: 'efectivo', label: 'Efectivo' },
                    { value: 'yape', label: 'Yape' },
                    { value: 'plin', label: 'Plin' },
                    { value: 'transferencia', label: 'Transferencia' },
                    { value: 'tarjeta', label: 'Tarjeta' }
                  ]}
                  value={{ value: paymentMethod, label: paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1) }}
                  onChange={(selected: any) => setPaymentMethod(selected ? selected.value : 'efectivo')}
                />
              </div>

              <div className="pt-4 border-t border-black-light dark:border-dark-light flex justify-end gap-3">
                <button 
                  className="btn btn-outline-secondary rounded-xl px-6"
                  onClick={() => setIsPaymentModalOpen(false)}
                >
                  Cancelar
                </button>
                <button 
                  className="btn btn-primary rounded-xl px-8"
                  onClick={handleAddPayment}
                  disabled={isSubmitting || paymentAmount <= 0}
                >
                  {isSubmitting ? 'Guardando...' : 'Guardar Abono'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
