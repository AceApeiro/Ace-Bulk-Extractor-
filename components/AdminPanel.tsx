
import React, { useState } from 'react';
import { User, Shield, Activity, Users, ChevronLeft, Plus, Settings, Search, Trash2, Save } from 'lucide-react';
import { User as UserType } from '../types';

interface AdminPanelProps {
  onBack: () => void;
  currentUser: UserType;
}

// Initial Mock Data
const INITIAL_USERS = [
  { id: 'UID01', username: 'UID01', role: 'ADMIN', lastActive: 'Now', status: 'Online' },
  { id: 'UID02', username: 'UID02', role: 'ADMIN', lastActive: '2h ago', status: 'Offline' },
  { id: 'OP-442', username: 'OP-442', role: 'OPERATOR', lastActive: '5m ago', status: 'Online' },
  { id: 'OP-881', username: 'OP-881', role: 'OPERATOR', lastActive: '1d ago', status: 'Offline' },
  { id: 'OP-102', username: 'OP-102', role: 'OPERATOR', lastActive: '3d ago', status: 'Inactive' },
];

const AdminPanel: React.FC<AdminPanelProps> = ({ onBack, currentUser }) => {
  const [users, setUsers] = useState(INITIAL_USERS);
  const [filter, setFilter] = useState('');
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', role: 'OPERATOR' });

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to revoke access for this user?')) {
      setUsers(prev => prev.filter(u => u.id !== id));
    }
  };

  const handleAddUser = () => {
      if (!newUser.username) return;
      const id = newUser.username.toUpperCase();
      // Simple duplicate check
      if (users.some(u => u.id === id)) {
          alert("User ID already exists.");
          return;
      }

      setUsers(prev => [...prev, {
          id: id,
          username: id,
          role: newUser.role,
          lastActive: 'Never',
          status: 'Offline'
      }]);
      setIsAddingUser(false);
      setNewUser({ username: '', role: 'OPERATOR' });
  };

  const filteredUsers = users.filter(u => u.username.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="h-full flex flex-col bg-[#050505] overflow-hidden">
      {/* Header */}
      <header className="h-16 border-b border-purple-900/30 bg-purple-900/5 flex items-center justify-between px-6 shrink-0 backdrop-blur-md">
        <div className="flex items-center gap-4">
           <button onClick={onBack} className="p-2 hover:bg-purple-500/10 rounded-lg text-purple-300 transition-colors">
              <ChevronLeft className="w-5 h-5" />
           </button>
           <div>
               <h1 className="text-xl font-orbitron font-bold text-purple-100 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-purple-400" /> ADMIN COMMAND
               </h1>
               <p className="text-[10px] text-purple-400/60 uppercase tracking-widest">User Management & System Oversight</p>
           </div>
        </div>
        <div className="flex items-center gap-4">
           <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/30">
               <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
               <span className="text-xs font-bold text-purple-200">{currentUser.username}</span>
           </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
         <div className="max-w-6xl mx-auto space-y-8">
            
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[#0a0a0a] border border-purple-900/30 p-6 rounded-xl flex items-center gap-4">
                    <div className="p-3 bg-purple-500/20 rounded-lg text-purple-400">
                        <Users className="w-8 h-8" />
                    </div>
                    <div>
                        <div className="text-3xl font-orbitron font-bold text-white">{users.length}</div>
                        <div className="text-xs text-slate-500 uppercase tracking-wider">Total Users</div>
                    </div>
                </div>
                <div className="bg-[#0a0a0a] border border-purple-900/30 p-6 rounded-xl flex items-center gap-4">
                    <div className="p-3 bg-green-500/20 rounded-lg text-green-400">
                        <Activity className="w-8 h-8" />
                    </div>
                    <div>
                        <div className="text-3xl font-orbitron font-bold text-white">{users.filter(u => u.status === 'Online').length}</div>
                        <div className="text-xs text-slate-500 uppercase tracking-wider">Active Now</div>
                    </div>
                </div>
                 <div className="bg-[#0a0a0a] border border-purple-900/30 p-6 rounded-xl flex items-center gap-4">
                    <div className="p-3 bg-blue-500/20 rounded-lg text-blue-400">
                        <Settings className="w-8 h-8" />
                    </div>
                    <div>
                        <div className="text-3xl font-orbitron font-bold text-white">v2.1</div>
                        <div className="text-xs text-slate-500 uppercase tracking-wider">System Version</div>
                    </div>
                </div>
            </div>

            {/* User Management Table */}
            <div className="bg-[#0a0a0a] border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
                <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                    <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wide">Authorized Personnel</h2>
                    <div className="flex gap-3">
                         <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input 
                                type="text" 
                                placeholder="Search users..."
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                                className="bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-1.5 text-xs text-slate-300 focus:border-purple-500 outline-none" 
                            />
                         </div>
                         <button 
                            onClick={() => setIsAddingUser(true)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold transition-all"
                        >
                             <Plus className="w-4 h-4" /> Add User
                         </button>
                    </div>
                </div>
                
                {/* Add User Row */}
                {isAddingUser && (
                    <div className="p-4 bg-purple-900/10 border-b border-purple-900/30 flex gap-4 items-center animate-fadeIn">
                        <input 
                            autoFocus
                            placeholder="User ID / Name" 
                            className="bg-slate-950 border border-slate-800 rounded px-3 py-1 text-sm text-white"
                            value={newUser.username}
                            onChange={e => setNewUser({...newUser, username: e.target.value})}
                        />
                        <select 
                            className="bg-slate-950 border border-slate-800 rounded px-3 py-1 text-sm text-white"
                            value={newUser.role}
                            onChange={e => setNewUser({...newUser, role: e.target.value})}
                        >
                            <option value="OPERATOR">OPERATOR</option>
                            <option value="ADMIN">ADMIN</option>
                        </select>
                        <button onClick={handleAddUser} className="px-3 py-1 bg-green-600 rounded text-white text-xs font-bold hover:bg-green-500">Save</button>
                        <button onClick={() => setIsAddingUser(false)} className="px-3 py-1 bg-slate-700 rounded text-slate-300 text-xs font-bold hover:bg-slate-600">Cancel</button>
                    </div>
                )}

                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-950 text-slate-500 text-[10px] uppercase font-bold">
                        <tr>
                            <th className="p-4 border-b border-slate-800">Operator ID</th>
                            <th className="p-4 border-b border-slate-800">Role</th>
                            <th className="p-4 border-b border-slate-800">Status</th>
                            <th className="p-4 border-b border-slate-800">Last Active</th>
                            <th className="p-4 border-b border-slate-800 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="text-xs text-slate-300 divide-y divide-slate-800">
                        {filteredUsers.map(user => (
                            <tr key={user.id} className="hover:bg-slate-900/50 transition-colors">
                                <td className="p-4 font-mono font-medium flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${user.role === 'ADMIN' ? 'bg-purple-900/30 text-purple-400' : 'bg-slate-800 text-slate-400'}`}>
                                        <User className="w-4 h-4" />
                                    </div>
                                    {user.username}
                                </td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded text-[10px] font-bold ${
                                        user.role === 'ADMIN' ? 'bg-purple-900/30 text-purple-300 border border-purple-800' : 'bg-slate-800 text-slate-400 border border-slate-700'
                                    }`}>
                                        {user.role}
                                    </span>
                                </td>
                                <td className="p-4">
                                     <div className="flex items-center gap-2">
                                         <div className={`w-2 h-2 rounded-full ${
                                             user.status === 'Online' ? 'bg-green-500' : user.status === 'Offline' ? 'bg-slate-600' : 'bg-orange-500'
                                         }`}></div>
                                         {user.status}
                                     </div>
                                </td>
                                <td className="p-4 text-slate-500 font-mono">{user.lastActive}</td>
                                <td className="p-4 text-right">
                                    <button 
                                        onClick={() => handleDelete(user.id)}
                                        className="p-2 hover:bg-red-500/10 text-slate-500 hover:text-red-500 rounded transition-colors"
                                        title="Revoke Access"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            <div className="p-6 bg-[#0a0a0a] border border-slate-800 rounded-xl text-center">
                <h3 className="text-slate-500 text-sm font-bold mb-2">Google Account Integration</h3>
                <p className="text-slate-600 text-xs mb-4">Enterprise SSO configuration is available for this domain.</p>
                <button className="px-4 py-2 bg-slate-900 border border-slate-700 text-slate-300 rounded hover:bg-slate-800 text-xs font-bold">
                    Configure OAuth 2.0
                </button>
            </div>

         </div>
      </div>
    </div>
  );
};

export default AdminPanel;
