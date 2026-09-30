/**
 * DairyPulse - Google Apps Script Backend
 * 
 * Multi-user dairy farm sales, expenses, buyers, and profit tracking backend for Google Sheets.
 * Authoritative single source of truth for authentication, farm records, and data isolation.
 */

// Helper to create standardized JSON responses
function createJsonResponse(data) {
  var output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

// Generate unique ID with random entropy (does not rely on row counts)
function generateId(prefix) {
  var timestamp = new Date().getTime();
  var random = Math.floor(Math.random() * 100000).toString(36).toUpperCase();
  return (prefix || 'DP') + '-' + timestamp + '-' + random;
}

// Format current ISO timestamp
function currentTimestamp() {
  return new Date().toISOString();
}

// Sheet headers configuration (authoritative schemas)
var SHEETS_SCHEMA = {
  'Farms': ['id', 'name', 'location', 'phone', 'description', 'status', 'createdAt', 'createdBy', 'ownerId', 'ownerEmail', 'updatedAt'],
  'Users': [
    'id', 'farmId', 'name', 'email', 'phone', 'username',
    'passwordHash', 'role', 'authMethod', 'status',
    'createdAt', 'updatedAt', 'lastLoginAt', 'createdBy'
  ],
  'Sessions': ['sessionId', 'userId', 'farmId', 'role', 'createdAt', 'expiresAt'],
  'MilkRecords': [
    'id', 'farmId', 'date', 'buyerId', 'buyerName', 'litres', 'pricePerLitre',
    'totalAmount', 'amountReceived', 'balance', 'paymentStatus', 'notes',
    'createdBy', 'createdByName', 'createdAt'
  ],
  'Buyers': ['id', 'farmId', 'name', 'phone', 'location', 'pricePerLitre', 'createdAt'],
  'Expenses': ['id', 'farmId', 'date', 'category', 'amount', 'description', 'notes', 'createdBy', 'createdAt'],
  'Sales': [
    'id', 'farmId', 'date', 'buyerId', 'buyerName', 'litres', 'pricePerLitre',
    'totalAmount', 'amountReceived', 'balance', 'paymentStatus', 'notes',
    'createdBy', 'createdByName', 'createdAt'
  ],
  'AuditLogs': ['id', 'farmId', 'date', 'action', 'description', 'user', 'createdAt'],
  'Activity_Log': ['id', 'farmId', 'date', 'action', 'description', 'user', 'createdAt']
};

// Compute deterministic SHA-256 hex hash
function hashPassword(password) {
  if (!password) return '';
  var rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(password), Utilities.Charset.UTF_8);
  var txtHash = '';
  for (var i = 0; i < rawHash.length; i++) {
    var byteVal = rawHash[i];
    if (byteVal < 0) byteVal += 256;
    var byteHex = byteVal.toString(16);
    if (byteHex.length === 1) byteHex = '0' + byteHex;
    txtHash += byteHex;
  }
  return txtHash;
}

// Verify Google ID Token via Google's tokeninfo API
function verifyGoogleIdToken(idToken) {
  if (!idToken || typeof idToken !== 'string') {
    return { valid: false, error: 'Token missing or invalid format' };
  }
  
  try {
    var url = 'https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken);
    var response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    var code = response.getResponseCode();
    var content = response.getContentText();
    
    if (code !== 200) {
      Logger.log('Tokeninfo error (' + code + '): ' + content);
      return { valid: false, error: 'Invalid Google credential token' };
    }
    
    var payload = JSON.parse(content);
    
    // Check issuer
    var iss = payload.iss;
    if (iss !== 'accounts.google.com' && iss !== 'https://accounts.google.com') {
      return { valid: false, error: 'Invalid token issuer' };
    }
    
    // Check expiration
    var nowSec = Math.floor(new Date().getTime() / 1000);
    if (payload.exp && Number(payload.exp) < nowSec) {
      return { valid: false, error: 'Google token has expired' };
    }
    
    // Check email & email_verified
    if (!payload.email) {
      return { valid: false, error: 'Email claim missing from Google token' };
    }
    
    var emailVerified = String(payload.email_verified) === 'true' || payload.email_verified === true;
    if (!emailVerified) {
      return { valid: false, error: 'Google email is not verified' };
    }
    
    return {
      valid: true,
      email: String(payload.email).toLowerCase().trim(),
      name: payload.name || '',
      picture: payload.picture || '',
      aud: payload.aud,
      sub: payload.sub
    };
  } catch (err) {
    Logger.log('Error verifying Google ID token: ' + err.toString());
    return { valid: false, error: 'Failed to verify Google token with identity provider' };
  }
}

// Ensure all required sheets and headers exist with automatic migration
function ensureDatabaseStructure() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  for (var sheetName in SHEETS_SCHEMA) {
    var sheet = ss.getSheetByName(sheetName);
    var headers = SHEETS_SCHEMA[sheetName];
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    } else {
      var lastRow = sheet.getLastRow();
      var lastCol = sheet.getLastColumn();
      if (lastRow === 0 || lastCol === 0) {
        sheet.appendRow(headers);
        sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
      } else {
        // Check for missing columns in existing sheet and append them non-destructively
        var existingHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
        headers.forEach(function(h) {
          if (existingHeaders.indexOf(h) === -1) {
            lastCol++;
            sheet.getRange(1, lastCol).setValue(h).setFontWeight('bold');
          }
        });
      }
    }
  }

  // Seed default farm and users ONLY if Users sheet is completely empty
  var usersSheet = ss.getSheetByName('Users');
  if (usersSheet && usersSheet.getLastRow() <= 1) {
    var defaultHash = hashPassword('Farm@2026');
    var ts = currentTimestamp();
    var uHeaders = usersSheet.getRange(1, 1, 1, usersSheet.getLastColumn()).getValues()[0];
    
    // Also ensure default farm exists in Farms sheet
    var farmsSheet = ss.getSheetByName('Farms');
    if (farmsSheet && farmsSheet.getLastRow() <= 1) {
      var fHeaders = farmsSheet.getRange(1, 1, 1, farmsSheet.getLastColumn()).getValues()[0];
      var seedFarm = {
        id: 'FARM-01',
        name: 'DairyPulse Model Farm',
        location: 'Mbarara, Uganda',
        phone: '+256 772 123456',
        description: 'Demonstration and reference dairy farm',
        status: 'Active',
        createdAt: ts,
        createdBy: 'USR-001',
        ownerId: 'USR-001',
        ownerEmail: 'owner@dairypulse.farm',
        updatedAt: ts
      };
      var fRow = [];
      for (var f = 0; f < fHeaders.length; f++) {
        var fh = fHeaders[f];
        fRow.push(seedFarm[fh] !== undefined ? seedFarm[fh] : '');
      }
      farmsSheet.appendRow(fRow);
    }
    
    var seedUser1 = {
      id: 'USR-001',
      farmId: 'FARM-01',
      name: 'Patrick Mugisha',
      email: 'owner@dairypulse.farm',
      phone: '+256 772 123456',
      username: 'patrick',
      passwordHash: defaultHash,
      role: 'owner',
      authMethod: 'both',
      status: 'Active',
      createdAt: ts,
      updatedAt: ts,
      lastLoginAt: '',
      createdBy: 'SYSTEM'
    };
    
    var seedUser2 = {
      id: 'USR-002',
      farmId: 'FARM-01',
      name: 'David Kato',
      email: 'david@dairypulse.farm',
      phone: '+256 701 987654',
      username: 'david',
      passwordHash: defaultHash,
      role: 'herdsman',
      authMethod: 'both',
      status: 'Active',
      createdAt: ts,
      updatedAt: ts,
      lastLoginAt: '',
      createdBy: 'USR-001'
    };
    
    var seedUser3 = {
      id: 'USR-003',
      farmId: 'FARM-01',
      name: 'John',
      email: 'john@gmail.com',
      phone: '+256 701 112233',
      username: 'john',
      passwordHash: defaultHash,
      role: 'herdsman',
      authMethod: 'both',
      status: 'Active',
      createdAt: ts,
      updatedAt: ts,
      lastLoginAt: '',
      createdBy: 'USR-001'
    };
    
    [seedUser1, seedUser2, seedUser3].forEach(function(u) {
      var row = [];
      for (var i = 0; i < uHeaders.length; i++) {
        var hName = uHeaders[i];
        row.push(u[hName] !== undefined ? u[hName] : '');
      }
      usersSheet.appendRow(row);
    });
  }
}

// Log audit trail to AuditLogs and Activity_Log sheets
function logAudit(action, description, user, farmId) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetsToLog = ['AuditLogs', 'Activity_Log'];
    var now = new Date();
    var dateStr = Utilities.formatDate(now, Session.getScriptTimeZone() || 'UTC', 'yyyy-MM-dd');
    var ts = currentTimestamp();
    var id = generateId('AUD');
    var effectiveFarmId = farmId || 'FARM-01';

    sheetsToLog.forEach(function(sName) {
      var sheet = ss.getSheetByName(sName);
      if (sheet) {
        var lastCol = sheet.getLastColumn();
        if (lastCol > 0) {
          var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
          var rowObj = {
            id: id,
            farmId: effectiveFarmId,
            date: dateStr,
            action: action,
            description: description,
            user: user || 'System',
            createdAt: ts
          };
          var r = [];
          for (var i = 0; i < headers.length; i++) {
            var h = headers[i];
            r.push(rowObj[h] !== undefined ? rowObj[h] : '');
          }
          sheet.appendRow(r);
        }
      }
    });
  } catch (e) {
    Logger.log('Error logging audit activity: ' + e.toString());
  }
}

function logActivity(action, description, user, farmId) {
  logAudit(action, description, user, farmId);
}

// Convert sheet data to array of JS objects
function getSheetData(sheetName) {
  ensureDatabaseStructure();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow <= 1 || lastCol === 0) return [];
  
  var values = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  var headers = values[0];
  var rows = [];
  
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    // Skip empty rows
    if (!row[0] && !row[1]) continue;
    
    var item = {};
    for (var j = 0; j < headers.length; j++) {
      var key = headers[j];
      var val = row[j];
      // Format dates nicely if they are Date objects
      if (val instanceof Date) {
        if (key === 'date') {
          val = Utilities.formatDate(val, Session.getScriptTimeZone() || 'UTC', 'yyyy-MM-dd');
        } else {
          val = val.toISOString();
        }
      }
      item[key] = val;
    }
    rows.push(item);
  }
  return rows;
}

// Create and record an authenticated session in the Sessions sheet
function createAndSaveSession(userId, role, farmId) {
  ensureDatabaseStructure();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sessionsSheet = ss.getSheetByName('Sessions');
  
  var now = new Date().getTime();
  var random = Math.floor(Math.random() * 1000000);
  var sessionId = 'DP-SES-' + userId + '-' + now + '-' + random;
  var createdAt = currentTimestamp();
  var expiresAt = new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days valid
  
  if (sessionsSheet) {
    var lastCol = sessionsSheet.getLastColumn();
    if (lastCol > 0) {
      var sHeaders = sessionsSheet.getRange(1, 1, 1, lastCol).getValues()[0];
      var sObj = {
        sessionId: sessionId,
        userId: userId,
        farmId: farmId,
        role: role,
        createdAt: createdAt,
        expiresAt: expiresAt
      };
      var row = [];
      for (var i = 0; i < sHeaders.length; i++) {
        var h = sHeaders[i];
        row.push(sObj[h] !== undefined ? sObj[h] : '');
      }
      sessionsSheet.appendRow(row);
    } else {
      sessionsSheet.appendRow([sessionId, userId, farmId, role, createdAt, expiresAt]);
    }
  }
  
  return {
    sessionId: sessionId,
    token: sessionId,
    userId: userId,
    farmId: farmId,
    role: role,
    createdAt: createdAt,
    expiresAt: expiresAt
  };
}

// Generate simple opaque session token (delegates to createAndSaveSession)
function generateSessionToken(userId, role, farmId) {
  var sess = createAndSaveSession(userId, role, farmId);
  return sess.sessionId;
}

/**
 * Authoritative session authentication helper:
 * Resolves session token -> userId -> Users sheet -> farmId & role
 * Never trusts frontend farmId or role.
 */
function authenticateSession(token) {
  if (!token || typeof token !== 'string') {
    return { authenticated: false, error: 'No session token provided' };
  }
  var trimmedToken = token.trim();
  if (!trimmedToken) {
    return { authenticated: false, error: 'Empty session token' };
  }
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sessionsSheet = ss.getSheetByName('Sessions');
  var sessionRecord = null;
  
  if (sessionsSheet && sessionsSheet.getLastRow() > 1 && sessionsSheet.getLastColumn() > 0) {
    var sData = sessionsSheet.getDataRange().getValues();
    var sHeaders = sData[0];
    var tokenIdx = sHeaders.indexOf('sessionId');
    var userIdx = sHeaders.indexOf('userId');
    var farmIdx = sHeaders.indexOf('farmId');
    var roleIdx = sHeaders.indexOf('role');
    var expIdx = sHeaders.indexOf('expiresAt');
    
    var nowMs = Date.now();
    for (var i = 1; i < sData.length; i++) {
      if (tokenIdx >= 0 && String(sData[i][tokenIdx]) === trimmedToken) {
        var expStr = expIdx >= 0 ? sData[i][expIdx] : '';
        if (expStr) {
          var expTime = new Date(expStr).getTime();
          if (!isNaN(expTime) && expTime < nowMs) {
            return { authenticated: false, error: 'Session has expired. Please sign in again.' };
          }
        }
        sessionRecord = {
          userId: userIdx >= 0 ? String(sData[i][userIdx]) : '',
          farmId: farmIdx >= 0 ? String(sData[i][farmIdx]) : '',
          role: roleIdx >= 0 ? String(sData[i][roleIdx]) : ''
        };
        break;
      }
    }
  }
  
  // Backward compatibility: extract userId from token format DP-SES-<userId>-...
  var targetUserId = sessionRecord ? sessionRecord.userId : '';
  if (!targetUserId && trimmedToken.indexOf('DP-SES-') === 0) {
    var parts = trimmedToken.split('-');
    if (parts.length >= 3) {
      targetUserId = parts[2];
    }
  }
  
  if (!targetUserId) {
    return { authenticated: false, error: 'Invalid session token' };
  }
  
  // Authoritative validation against Users sheet
  var usersSheet = ss.getSheetByName('Users');
  if (!usersSheet || usersSheet.getLastRow() <= 1) {
    return { authenticated: false, error: 'Users database not initialized' };
  }
  
  var uData = usersSheet.getDataRange().getValues();
  var uHeaders = uData[0];
  var uIdIdx = uHeaders.indexOf('id');
  var uFarmIdx = uHeaders.indexOf('farmId');
  var uRoleIdx = uHeaders.indexOf('role');
  var uNameIdx = uHeaders.indexOf('name');
  var uEmailIdx = uHeaders.indexOf('email');
  var uStatusIdx = uHeaders.indexOf('status');
  var uActiveIdx = uHeaders.indexOf('active');
  
  for (var u = 1; u < uData.length; u++) {
    if (String(uData[u][uIdIdx]) === targetUserId) {
      var row = uData[u];
      var status = uStatusIdx >= 0 ? String(row[uStatusIdx]).trim().toLowerCase() : 'active';
      var active = uActiveIdx >= 0 ? String(row[uActiveIdx]).trim().toLowerCase() : 'true';
      if (status === 'inactive' || active === 'false') {
        return { authenticated: false, error: 'Account is inactive' };
      }
      
      var farmId = uFarmIdx >= 0 && row[uFarmIdx] ? String(row[uFarmIdx]).trim() : (sessionRecord ? sessionRecord.farmId : 'FARM-01');
      var role = uRoleIdx >= 0 && row[uRoleIdx] ? String(row[uRoleIdx]).trim().toLowerCase() : (sessionRecord ? sessionRecord.role : 'herdsman');
      if (role.indexOf('owner') >= 0 || role.indexOf('admin') >= 0) {
        role = 'owner';
      } else {
        role = 'herdsman';
      }
      
      var name = uNameIdx >= 0 ? String(row[uNameIdx]) : 'User';
      var email = uEmailIdx >= 0 ? String(row[uEmailIdx]) : '';
      
      return {
        authenticated: true,
        user: {
          id: targetUserId,
          farmId: farmId,
          role: role,
          name: name,
          email: email
        }
      };
    }
  }
  
  return { authenticated: false, error: 'User associated with session not found' };
}

/**
 * Handle GET requests
 */
function doGet(e) {
  try {
    ensureDatabaseStructure();
    var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : 'health';
    var reqToken = (e && e.parameter && (e.parameter.token || e.parameter.sessionId)) ? String(e.parameter.token || e.parameter.sessionId).trim() : '';

    if (action === 'health') {
      return createJsonResponse({
        success: true,
        status: 'ok',
        version: '2.2.0',
        timestamp: currentTimestamp()
      });
    }

    // Explicit session verification endpoint
    if (action === 'validateSession' || action === 'verifySession') {
      var authRes = authenticateSession(reqToken);
      if (!authRes.authenticated) {
        return createJsonResponse({
          success: false,
          error: authRes.error || 'Invalid or expired session. Please sign in again.',
          code: 'UNAUTHORIZED'
        });
      }
      var farms = getSheetData('Farms');
      var farmObj = null;
      for (var f = 0; f < farms.length; f++) {
        if (String(farms[f].id) === authRes.user.farmId) {
          farmObj = farms[f];
          break;
        }
      }
      return createJsonResponse({
        success: true,
        user: authRes.user,
        farm: farmObj || { id: authRes.user.farmId, name: 'Farm' }
      });
    }

    // Determine authoritative farmId & role: derived from session if provided
    var effectiveFarmId = '';
    var effectiveRole = '';
    if (reqToken) {
      var sessionCheck = authenticateSession(reqToken);
      if (!sessionCheck.authenticated) {
        return createJsonResponse({
          success: false,
          error: sessionCheck.error || 'Invalid or expired session. Please sign in again.',
          code: 'UNAUTHORIZED'
        });
      }
      effectiveFarmId = sessionCheck.user.farmId;
      effectiveRole = sessionCheck.user.role;
    } else {
      // If no token supplied, only fall back to reqFarmId if provided
      effectiveFarmId = (e && e.parameter && e.parameter.farmId) ? String(e.parameter.farmId).trim() : 'FARM-01';
      effectiveRole = 'herdsman';
    }

    function belongsToFarm(item) {
      var fId = item.farmId ? String(item.farmId).trim() : 'FARM-01';
      return fId === effectiveFarmId;
    }

    if (action === 'farm') {
      var farms = getSheetData('Farms');
      var farm = null;
      for (var f = 0; f < farms.length; f++) {
        if (String(farms[f].id) === effectiveFarmId) {
          farm = farms[f];
          break;
        }
      }
      return createJsonResponse({
        success: true,
        data: farm || { id: effectiveFarmId, name: 'Farm' }
      });
    }
    
    if (action === 'sales' || action === 'getMilkRecords') {
      var rawSales = getSheetData('Sales');
      if (rawSales.length === 0) {
        rawSales = getSheetData('MilkRecords');
      }
      var sales = rawSales.filter(belongsToFarm);
      return createJsonResponse({
        success: true,
        data: sales
      });
    }
    
    if (action === 'expenses') {
      // Herdsman is strictly forbidden from viewing farm expenses
      if (effectiveRole === 'herdsman') {
        return createJsonResponse({
          success: false,
          error: 'Unauthorized: Herdsmen cannot view farm expenses',
          code: 'FORBIDDEN'
        });
      }
      var rawExpenses = getSheetData('Expenses');
      var expenses = rawExpenses.filter(belongsToFarm);
      return createJsonResponse({
        success: true,
        data: expenses
      });
    }
    
    if (action === 'buyers') {
      var rawBuyers = getSheetData('Buyers');
      var buyers = rawBuyers.filter(belongsToFarm);
      var rawSales = getSheetData('Sales');
      if (rawSales.length === 0) {
        rawSales = getSheetData('MilkRecords');
      }
      var sales = rawSales.filter(belongsToFarm);
      
      // Calculate amount owed for each buyer of this farm
      var balances = {};
      sales.forEach(function(sale) {
        var bId = String(sale.buyerId);
        var bal = parseFloat(sale.balance) || 0;
        balances[bId] = (balances[bId] || 0) + bal;
      });
      
      buyers.forEach(function(buyer) {
        buyer.amountOwed = balances[String(buyer.id)] || 0;
      });
      
      return createJsonResponse({
        success: true,
        data: buyers
      });
    }
    
    if (action === 'users') {
      // Herdsman cannot view the users / team list
      if (effectiveRole === 'herdsman') {
        return createJsonResponse({
          success: false,
          error: 'Unauthorized: Herdsmen cannot view user accounts',
          code: 'FORBIDDEN'
        });
      }
      var rawUsers = getSheetData('Users');
      var filteredUsers = rawUsers.filter(belongsToFarm);
      var sanitized = filteredUsers.map(function(u) {
        var role = String(u.role || 'herdsman').toLowerCase();
        if (role.indexOf('owner') >= 0 || role.indexOf('admin') >= 0) {
          role = 'owner';
        } else {
          role = 'herdsman';
        }
        
        var statusStr = String(u.status || (u.active !== undefined ? (String(u.active) === 'true' ? 'Active' : 'Inactive') : 'Active'));
        var isActive = statusStr.toLowerCase() === 'active' || String(u.active).toLowerCase() === 'true';
        
        return {
          id: u.id,
          farmId: u.farmId || effectiveFarmId,
          name: u.name,
          email: u.email || '',
          username: u.username || (u.name ? u.name.toLowerCase().replace(/\s+/g, '') : ''),
          phone: u.phone || '',
          role: role,
          authMethod: u.authMethod || (u.email ? 'both' : 'password'),
          status: isActive ? 'Active' : 'Inactive',
          active: isActive,
          title: role === 'owner' ? 'Farm Owner / Admin' : 'Herdsman',
          createdAt: u.createdAt || currentTimestamp(),
          updatedAt: u.updatedAt || currentTimestamp(),
          lastLoginAt: u.lastLoginAt || ''
        };
      });
      return createJsonResponse({
        success: true,
        data: sanitized
      });
    }
    
    if (action === 'activity' || action === 'audit') {
      var rawActivity = getSheetData('AuditLogs');
      if (rawActivity.length === 0) {
        rawActivity = getSheetData('Activity_Log');
      }
      var activity = rawActivity.filter(belongsToFarm);
      return createJsonResponse({
        success: true,
        data: activity
      });
    }
    
    if (action === 'dashboard') {
      var rawSales = getSheetData('Sales');
      if (rawSales.length === 0) {
        rawSales = getSheetData('MilkRecords');
      }
      var sales = rawSales.filter(belongsToFarm);
      var expenses = getSheetData('Expenses').filter(belongsToFarm);
      var buyers = getSheetData('Buyers').filter(belongsToFarm);
      
      var now = new Date();
      var todayStr = Utilities.formatDate(now, Session.getScriptTimeZone() || 'UTC', 'yyyy-MM-dd');
      
      var todayLitres = 0;
      var todaySales = 0;
      var todayReceived = 0;
      var todayExpenses = 0;
      
      var totalLitres = 0;
      var totalSales = 0;
      var totalReceived = 0;
      var totalExpenses = 0;
      var totalBalance = 0;
      
      sales.forEach(function(s) {
        var litres = parseFloat(s.litres) || 0;
        var total = parseFloat(s.totalAmount) || 0;
        var rcvd = parseFloat(s.amountReceived) || 0;
        var bal = parseFloat(s.balance) || 0;
        
        totalLitres += litres;
        totalSales += total;
        totalReceived += rcvd;
        totalBalance += bal;
        
        if (s.date === todayStr) {
          todayLitres += litres;
          todaySales += total;
          todayReceived += rcvd;
        }
      });
      
      expenses.forEach(function(ex) {
        var amt = parseFloat(ex.amount) || 0;
        totalExpenses += amt;
        if (ex.date === todayStr) {
          todayExpenses += amt;
        }
      });
      
      var todayProfit = todayReceived - todayExpenses;
      var overallProfit = totalReceived - totalExpenses;
      
      return createJsonResponse({
        success: true,
        data: {
          today: {
            date: todayStr,
            litres: todayLitres,
            sales: todaySales,
            moneyIn: todayReceived,
            moneySpent: todayExpenses,
            profit: todayProfit
          },
          overall: {
            litres: totalLitres,
            sales: totalSales,
            moneyIn: totalReceived,
            moneySpent: totalExpenses,
            moneyOwed: totalBalance,
            profit: overallProfit
          },
          counts: {
            salesCount: sales.length,
            expensesCount: expenses.length,
            buyersCount: buyers.length
          }
        }
      });
    }
    
    return createJsonResponse({
      success: false,
      error: 'Unknown action: ' + action
    });
  } catch (error) {
    return createJsonResponse({
      success: false,
      error: error.message || error.toString()
    });
  }
}

/**
 * Handle POST requests
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    // Wait up to 10 seconds for concurrent write safety
    lock.waitLock(10000);
    ensureDatabaseStructure();
    
    var payload = {};
    if (e && e.postData && e.postData.contents) {
      try {
        payload = JSON.parse(e.postData.contents);
      } catch (parseErr) {
        payload = e.parameter || {};
      }
    } else if (e && e.parameter) {
      payload = e.parameter;
    }
    
    var action = payload.action;
    if (!action) {
      return createJsonResponse({
        success: false,
        error: 'Missing action in request payload'
      });
    }
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // =========================================================================
    // 0. NEW FARM & OWNER REGISTRATION (ONBOARDING)
    // =========================================================================
    if (action === 'registerFarm') {
      var regData = payload.data || payload;
      var ownerName = String(regData.ownerName || '').trim();
      var ownerEmail = String(regData.ownerEmail || '').trim().toLowerCase();
      var ownerPhone = String(regData.ownerPhone || '').trim();
      var password = String(regData.password || '').trim();
      var farmName = String(regData.farmName || '').trim();
      var farmLocation = String(regData.farmLocation || '').trim();
      var farmPhone = String(regData.farmPhone || '').trim();
      var farmDescription = String(regData.farmDescription || '').trim();

      // 1. Comprehensive input validation before any database write
      if (!ownerName) {
        return createJsonResponse({ success: false, error: 'Full name is required.', code: 'INVALID_INPUT' });
      }
      if (!ownerEmail || ownerEmail.indexOf('@') === -1 || ownerEmail.indexOf('.') === -1) {
        return createJsonResponse({ success: false, error: 'Please enter a valid email address.', code: 'INVALID_INPUT' });
      }
      if (!password || password.length < 6) {
        return createJsonResponse({ success: false, error: 'Password must be at least 6 characters.', code: 'INVALID_INPUT' });
      }
      if (!farmName) {
        return createJsonResponse({ success: false, error: 'Farm name is required.', code: 'INVALID_INPUT' });
      }
      if (!farmLocation) {
        return createJsonResponse({ success: false, error: 'Farm location is required.', code: 'INVALID_INPUT' });
      }

      var usersSheet = ss.getSheetByName('Users');
      var uHeaders = SHEETS_SCHEMA['Users'];
      if (!usersSheet) {
        usersSheet = ss.insertSheet('Users');
        usersSheet.appendRow(uHeaders);
        usersSheet.getRange(1, 1, 1, uHeaders.length).setFontWeight('bold');
      } else if (usersSheet.getLastColumn() <= 0) {
        usersSheet.appendRow(uHeaders);
        usersSheet.getRange(1, 1, 1, uHeaders.length).setFontWeight('bold');
      } else {
        uHeaders = usersSheet.getRange(1, 1, 1, usersSheet.getLastColumn()).getValues()[0];
      }
      var usersData = usersSheet.getDataRange().getValues();
      var emailIdx = uHeaders.indexOf('email');
      var userIdx = uHeaders.indexOf('username');

      // 2. Strict normalized email uniqueness verification
      if (emailIdx >= 0) {
        for (var u = 1; u < usersData.length; u++) {
          if (String(usersData[u][emailIdx]).trim().toLowerCase() === ownerEmail) {
            return createJsonResponse({
              success: false,
              error: 'An account with this email address already exists. Please sign in instead.',
              code: 'ACCOUNT_EXISTS'
            });
          }
        }
      }

      // 3. Robust unique ID generation
      var farmId = generateId('FRM');
      var userId = generateId('USR');
      var baseUsername = ownerEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '');
      if (!baseUsername) {
        baseUsername = ownerName.toLowerCase().replace(/[^a-z0-9_]/g, '');
      }

      var finalUsername = baseUsername;
      var suffix = 1;
      var exists = true;
      while (exists) {
        exists = false;
        if (userIdx >= 0) {
          for (var j = 1; j < usersData.length; j++) {
            if (String(usersData[j][userIdx]).trim().toLowerCase() === finalUsername) {
              exists = true;
              finalUsername = baseUsername + suffix;
              suffix++;
              break;
            }
          }
        }
      }

      var nowIso = currentTimestamp();
      var passwordHash = hashPassword(password);

      // 4. ATOMIC REGISTRATION WITH TRANSACTION ROLLBACK
      var farmsSheet = ss.getSheetByName('Farms');
      var fHeaders = SHEETS_SCHEMA['Farms'];
      if (!farmsSheet) {
        farmsSheet = ss.insertSheet('Farms');
        farmsSheet.appendRow(fHeaders);
        farmsSheet.getRange(1, 1, 1, fHeaders.length).setFontWeight('bold');
      } else if (farmsSheet.getLastColumn() <= 0) {
        farmsSheet.appendRow(fHeaders);
        farmsSheet.getRange(1, 1, 1, fHeaders.length).setFontWeight('bold');
      } else {
        fHeaders = farmsSheet.getRange(1, 1, 1, farmsSheet.getLastColumn()).getValues()[0];
      }

      var farmObj = {
        id: farmId,
        name: farmName,
        location: farmLocation,
        phone: farmPhone,
        description: farmDescription,
        status: 'Active',
        createdAt: nowIso,
        createdBy: userId,
        ownerId: userId,
        ownerEmail: ownerEmail,
        updatedAt: nowIso
      };
      var fRow = [];
      for (var f = 0; f < fHeaders.length; f++) {
        var fH = fHeaders[f];
        fRow.push(farmObj[fH] !== undefined ? farmObj[fH] : '');
      }

      // Step A: Append Farm record and track its row position
      var farmRowIndex = -1;
      try {
        farmsSheet.appendRow(fRow);
        farmRowIndex = farmsSheet.getLastRow();
      } catch (farmWriteErr) {
        return createJsonResponse({
          success: false,
          error: 'We couldn’t create the farm record. Please try again.',
          code: 'FARM_WRITE_ERROR'
        });
      }

      // Step B: Prepare Owner User record
      var newUserObj = {
        id: userId,
        farmId: farmId,
        name: ownerName,
        email: ownerEmail,
        phone: ownerPhone,
        username: finalUsername,
        passwordHash: passwordHash,
        role: 'owner',
        authMethod: 'both',
        status: 'Active',
        active: 'true',
        createdAt: nowIso,
        updatedAt: nowIso,
        lastLoginAt: nowIso,
        createdBy: 'SELF_REGISTER'
      };

      var newRow = [];
      for (var h = 0; h < uHeaders.length; h++) {
        var hName = uHeaders[h];
        newRow.push(newUserObj[hName] !== undefined ? newUserObj[hName] : '');
      }

      // Step C: Append User record with rollback on failure
      try {
        usersSheet.appendRow(newRow);
      } catch (userWriteErr) {
        // Rollback: remove the created farm row to prevent orphan farms
        try {
          if (farmRowIndex > 1) {
            farmsSheet.deleteRow(farmRowIndex);
          }
        } catch (rollbackErr) {
          logAudit('CRITICAL_ROLLBACK_FAILURE', 'Failed to rollback orphan farm ' + farmId + ': ' + rollbackErr.toString(), 'SYSTEM', farmId);
          return createJsonResponse({
            success: false,
            error: 'Account creation failed during user creation and cleanup could not be completed. Please contact administrator.',
            code: 'TRANSACTION_ROLLBACK_FAILED'
          });
        }
        return createJsonResponse({
          success: false,
          error: 'Account creation failed during user setup. The operation was safely cancelled. Please try again.',
          code: 'USER_CREATION_FAILED'
        });
      }

      // Step D: Create authoritative session in Sessions sheet
      var sessionObj = createAndSaveSession(userId, 'owner', farmId);
      logAudit('REGISTER_FARM', farmName + ' registered by ' + ownerName + ' (' + ownerEmail + ')', ownerName, farmId);

      var safeUser = {
        id: userId,
        farmId: farmId,
        farmName: farmName,
        name: ownerName,
        email: ownerEmail,
        username: finalUsername,
        role: 'owner',
        title: 'Farm Owner / Admin',
        phone: ownerPhone,
        authMethod: 'both',
        status: 'Active',
        active: true,
        createdAt: nowIso,
        lastLoginAt: nowIso
      };

      return createJsonResponse({
        success: true,
        message: 'Registration successful',
        user: safeUser,
        farm: farmObj,
        token: sessionObj.sessionId,
        data: {
          user: safeUser,
          farm: farmObj,
          token: sessionObj.sessionId
        }
      });
    }

    // =========================================================================
    // 1. GOOGLE LOGIN AUTHENTICATION
    // =========================================================================
    if (action === 'googleLogin') {
      var cred = payload.credential || (payload.data && payload.data.credential);
      if (!cred) {
        return createJsonResponse({
          success: false,
          error: 'Google credential token is required'
        });
      }
      
      var tokenResult = verifyGoogleIdToken(cred);
      if (!tokenResult.valid) {
        return createJsonResponse({
          success: false,
          error: tokenResult.error || 'Google sign-in could not be completed. Please try again.'
        });
      }
      
      var verifiedEmail = tokenResult.email;
      var usersSheet = ss.getSheetByName('Users');
      var usersData = usersSheet.getDataRange().getValues();
      var headers = usersData[0];
      
      var emailIdx = headers.indexOf('email');
      var statusIdx = headers.indexOf('status');
      var activeIdx = headers.indexOf('active');
      var roleIdx = headers.indexOf('role');
      var nameIdx = headers.indexOf('name');
      var userIdx = headers.indexOf('username');
      var idIdx = headers.indexOf('id');
      var farmIdx = headers.indexOf('farmId');
      var authMethodIdx = headers.indexOf('authMethod');
      var lastLoginIdx = headers.indexOf('lastLoginAt');
      
      var foundRow = -1;
      for (var i = 1; i < usersData.length; i++) {
        var row = usersData[i];
        var rowEmail = emailIdx >= 0 && row[emailIdx] ? String(row[emailIdx]).trim().toLowerCase() : '';
        if (rowEmail === verifiedEmail) {
          foundRow = i;
          break;
        }
      }
      
      // If unregistered Google account -> do NOT create account, return NEW_GOOGLE_USER
      if (foundRow === -1) {
        return createJsonResponse({
          success: false,
          code: 'NEW_GOOGLE_USER',
          email: verifiedEmail,
          name: tokenResult.name || '',
          error: "No DairyPulse account found for " + verifiedEmail + ". Please create your farm account or ask your farm owner to invite you."
        });
      }
      
      var matchedRow = usersData[foundRow];
      var statusStr = statusIdx >= 0 && matchedRow[statusIdx] ? String(matchedRow[statusIdx]).trim().toLowerCase() : '';
      var activeStr = activeIdx >= 0 && matchedRow[activeIdx] ? String(matchedRow[activeIdx]).trim().toLowerCase() : '';
      var isActive = (statusStr === 'active' || activeStr === 'true') && statusStr !== 'inactive' && activeStr !== 'false';
      
      // Inactive user check
      if (!isActive) {
        return createJsonResponse({
          success: false,
          error: 'This account is inactive. Please contact your farm administrator for access.'
        });
      }
      
      // Check auth method allowed for this user
      var allowedAuthMethod = authMethodIdx >= 0 && matchedRow[authMethodIdx] ? String(matchedRow[authMethodIdx]).toLowerCase() : 'both';
      if (allowedAuthMethod === 'password') {
        return createJsonResponse({
          success: false,
          error: 'Google Sign-In is not enabled for this account. Please sign in with your username and password.'
        });
      }
      
      var userRole = String(roleIdx >= 0 ? matchedRow[roleIdx] : 'herdsman').toLowerCase();
      if (userRole.indexOf('owner') >= 0 || userRole.indexOf('admin') >= 0) {
        userRole = 'owner';
      } else {
        userRole = 'herdsman';
      }
      
      var userId = String(idIdx >= 0 ? matchedRow[idIdx] : 'USR-' + foundRow);
      var farmId = String(farmIdx >= 0 && matchedRow[farmIdx] ? matchedRow[farmIdx] : 'FARM-01');
      var userName = String(nameIdx >= 0 && matchedRow[nameIdx] ? matchedRow[nameIdx] : (tokenResult.name || 'User'));
      var username = String(userIdx >= 0 && matchedRow[userIdx] ? matchedRow[userIdx] : verifiedEmail.split('@')[0]);
      var nowIso = currentTimestamp();
      
      // Update lastLoginAt in sheet
      if (lastLoginIdx >= 0) {
        usersSheet.getRange(foundRow + 1, lastLoginIdx + 1).setValue(nowIso);
      }
      
      var sessionObj = createAndSaveSession(userId, userRole, farmId);
      logAudit('LOGIN_GOOGLE', userName + ' (' + userRole + ') signed in with Google: ' + verifiedEmail, userName, farmId);
      
      var safeGoogleUser = {
        id: userId,
        farmId: farmId,
        name: userName,
        email: verifiedEmail,
        username: username,
        role: userRole,
        authMethod: allowedAuthMethod,
        status: 'Active',
        active: true,
        title: userRole === 'owner' ? 'Farm Owner / Admin' : 'Herdsman',
        lastLoginAt: nowIso
      };

      return createJsonResponse({
        success: true,
        user: safeGoogleUser,
        data: {
          user: safeGoogleUser,
          token: sessionObj.sessionId
        },
        token: sessionObj.sessionId
      });
    }

    // =========================================================================
    // 2. USERNAME + PASSWORD LOGIN
    // =========================================================================
    if (action === 'login') {
      var creds = payload.data || payload;
      var rawUsername = (creds.username || '').toString().trim();
      var username = rawUsername.toLowerCase();
      var password = (creds.password || '').toString().trim();
      
      if (!username || !password) {
        return createJsonResponse({
          success: false,
          error: 'Username or password is required'
        });
      }
      
      var usersSheet = ss.getSheetByName('Users');
      var usersData = usersSheet.getDataRange().getValues();
      var headers = usersData[0];
      
      var idIdx = headers.indexOf('id');
      var nameIdx = headers.indexOf('name');
      var userIdx = headers.indexOf('username');
      var emailIdx = headers.indexOf('email');
      var pwdIdx = headers.indexOf('passwordHash');
      var roleIdx = headers.indexOf('role');
      var farmIdx = headers.indexOf('farmId');
      var phoneIdx = headers.indexOf('phone');
      var activeIdx = headers.indexOf('active');
      var statusIdx = headers.indexOf('status');
      var authMethodIdx = headers.indexOf('authMethod');
      var lastLoginIdx = headers.indexOf('lastLoginAt');
      var createdIdx = headers.indexOf('createdAt');
      
      var foundRow = -1;
      for (var i = 1; i < usersData.length; i++) {
        var row = usersData[i];
        var uName = String(userIdx >= 0 && row[userIdx] ? row[userIdx] : '').trim().toLowerCase();
        var uEmail = emailIdx >= 0 && row[emailIdx] ? String(row[emailIdx]).trim().toLowerCase() : '';
        var rawName = String(nameIdx >= 0 && row[nameIdx] ? row[nameIdx] : '').trim().toLowerCase();
        var rawNameNoSpace = rawName.replace(/\s+/g, '');
        var usernameNoSpace = username.replace(/\s+/g, '');

        if (
          (uName && uName === username) ||
          (uEmail && uEmail === username) ||
          (rawName && rawName === username) ||
          (rawNameNoSpace && rawNameNoSpace === usernameNoSpace)
        ) {
          foundRow = i;
          break;
        }
      }
      
      if (foundRow === -1) {
        return createJsonResponse({
          success: false,
          error: 'Username or password is incorrect.'
        });
      }
      
      var matchedRow = usersData[foundRow];
      var statusStr = statusIdx >= 0 && matchedRow[statusIdx] ? String(matchedRow[statusIdx]).trim().toLowerCase() : '';
      var activeStr = activeIdx >= 0 && matchedRow[activeIdx] ? String(matchedRow[activeIdx]).trim().toLowerCase() : '';
      var isActive = (statusStr === 'active' || activeStr === 'true') && statusStr !== 'inactive' && activeStr !== 'false';
      
      if (!isActive) {
        return createJsonResponse({
          success: false,
          error: 'This account is inactive. Please contact your farm administrator for access.'
        });
      }
      
      var allowedAuthMethod = authMethodIdx >= 0 && matchedRow[authMethodIdx] ? String(matchedRow[authMethodIdx]).toLowerCase() : 'both';
      if (allowedAuthMethod === 'google') {
        return createJsonResponse({
          success: false,
          error: 'Password login is disabled for this account. Please use "Continue with Google".'
        });
      }
      
      var storedHash = pwdIdx >= 0 ? String(matchedRow[pwdIdx] || '').trim() : '';
      var inputHash = hashPassword(password);
      var defaultFarmHash = hashPassword('Farm@2026');
      
      var passwordValid = false;
      if (storedHash) {
        if (
          storedHash === inputHash ||
          storedHash.toLowerCase() === inputHash.toLowerCase() ||
          storedHash === password ||
          storedHash.toLowerCase() === password.toLowerCase() ||
          (storedHash.toLowerCase() === defaultFarmHash.toLowerCase() && password.toLowerCase() === 'farm@2026')
        ) {
          passwordValid = true;
        }
      } else {
        // If sheet row has no password yet, allow standard farm default
        if (password === 'Farm@2026' || password.toLowerCase() === 'farm@2026') {
          passwordValid = true;
          if (pwdIdx >= 0) {
            usersSheet.getRange(foundRow + 1, pwdIdx + 1).setValue(defaultFarmHash);
          }
        }
      }
      
      if (!passwordValid) {
        return createJsonResponse({
          success: false,
          error: 'Username or password is incorrect.'
        });
      }
      
      // If stored password was plaintext or lowercase match, upgrade to SHA-256 hash
      if (pwdIdx >= 0 && (storedHash === password || storedHash !== inputHash) && !storedHash.startsWith('dairypulse_')) {
        usersSheet.getRange(foundRow + 1, pwdIdx + 1).setValue(inputHash);
      }
      
      var userRole = String(roleIdx >= 0 ? matchedRow[roleIdx] : 'herdsman').toLowerCase();
      if (userRole.indexOf('owner') >= 0 || userRole.indexOf('admin') >= 0) {
        userRole = 'owner';
      } else {
        userRole = 'herdsman';
      }
      
      var userId = String(idIdx >= 0 ? matchedRow[idIdx] : 'USR-' + foundRow);
      var farmId = String(farmIdx >= 0 && matchedRow[farmIdx] ? matchedRow[farmIdx] : 'FARM-01');
      var nowIso = currentTimestamp();
      
      if (lastLoginIdx >= 0) {
        usersSheet.getRange(foundRow + 1, lastLoginIdx + 1).setValue(nowIso);
      }
      
      var safeUser = {
        id: userId,
        farmId: farmId,
        name: String(nameIdx >= 0 ? matchedRow[nameIdx] : 'User'),
        email: emailIdx >= 0 ? String(matchedRow[emailIdx] || '') : '',
        username: String(userIdx >= 0 && matchedRow[userIdx] ? matchedRow[userIdx] : username),
        role: userRole,
        title: userRole === 'owner' ? 'Farm Owner / Admin' : 'Herdsman',
        authMethod: allowedAuthMethod,
        phone: String(phoneIdx >= 0 ? matchedRow[phoneIdx] : ''),
        status: 'Active',
        active: true,
        lastLoginAt: nowIso,
        createdAt: String(createdIdx >= 0 ? matchedRow[createdIdx] : nowIso)
      };
      
      var sessionObj = createAndSaveSession(userId, userRole, farmId);
      logAudit('LOGIN_PASSWORD', safeUser.name + ' (' + safeUser.role + ') logged in', safeUser.name, farmId);
      
      return createJsonResponse({
        success: true,
        user: safeUser,
        data: {
          user: safeUser,
          token: sessionObj.sessionId
        },
        token: sessionObj.sessionId
      });
    }

    // =========================================================================
    // AUTHORIZATION ENFORCEMENT FOR ALL OTHER POST ACTIONS
    // Derive farmId, userId, role from authenticated session (NEVER client payload)
    // =========================================================================
    var reqSessionToken = payload.token || (payload.data && payload.data.token) || '';
    var authCheck = authenticateSession(reqSessionToken);
    if (!authCheck.authenticated) {
      return createJsonResponse({
        success: false,
        error: authCheck.error || 'Unauthorized: Invalid or expired session. Please sign in again.',
        code: 'UNAUTHORIZED'
      });
    }

    var authUser = authCheck.user;
    var authFarmId = authUser.farmId;
    var authUserId = authUser.id;
    var authUserName = authUser.name;
    var authUserRole = authUser.role;

    // =========================================================================
    // 3. CREATE SALE / MILK RECORD (WITH BUYER PRICE PROTECTION & AUDIT)
    // =========================================================================
    if (action === 'createSale' || action === 'createMilkRecord') {
      var saleData = payload.data || payload;
      var litres = parseFloat(saleData.litres);
      var amountReceived = parseFloat(saleData.amountReceived);
      
      if (isNaN(litres) || litres <= 0) {
        return createJsonResponse({ success: false, error: 'Litres sold must be greater than 0' });
      }
      if (isNaN(amountReceived) || amountReceived < 0) {
        amountReceived = 0;
      }
      
      // SERVER-SIDE BUYER PRICE ENFORCEMENT FOR THIS FARM ONLY
      var price = parseFloat(saleData.pricePerLitre);
      var buyerId = saleData.buyerId || '';
      var buyerName = saleData.buyerName || 'Cash Customer';
      
      if (buyerId) {
        var buyersSheet = ss.getSheetByName('Buyers');
        if (buyersSheet && buyersSheet.getLastRow() > 1) {
          var buyersData = buyersSheet.getDataRange().getValues();
          var bHeaders = buyersData[0];
          var bIdIdx = bHeaders.indexOf('id');
          var bFarmIdx = bHeaders.indexOf('farmId');
          var bPriceIdx = bHeaders.indexOf('pricePerLitre');
          var bNameIdx = bHeaders.indexOf('name');
          
          for (var b = 1; b < buyersData.length; b++) {
            var rowBId = bIdIdx >= 0 ? String(buyersData[b][bIdIdx]) : String(buyersData[b][0]);
            var rowBFarm = bFarmIdx >= 0 ? String(buyersData[b][bFarmIdx]) : 'FARM-01';
            
            if (rowBId === String(buyerId) && rowBFarm === authFarmId) {
              var savedPrice = bPriceIdx >= 0 ? parseFloat(buyersData[b][bPriceIdx]) : parseFloat(buyersData[b][4]);
              if (!isNaN(savedPrice) && savedPrice > 0) {
                price = savedPrice; // Authoritative saved price enforced
              }
              if (bNameIdx >= 0 && buyersData[b][bNameIdx]) {
                buyerName = buyersData[b][bNameIdx];
              }
              break;
            }
          }
        }
      }
      
      if (isNaN(price) || price <= 0) {
        price = 3500;
      }
      
      var totalAmount = Math.round(litres * price);
      var balance = Math.round(totalAmount - amountReceived);
      if (balance < 0) balance = 0;
      
      var paymentStatus = 'Not Paid';
      if (balance <= 0) {
        paymentStatus = 'Paid';
        amountReceived = totalAmount;
        balance = 0;
      } else if (amountReceived > 0) {
        paymentStatus = 'Partly Paid';
      }
      
      var saleId = saleData.id || generateId('SAL');
      var dateStr = saleData.date || Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'UTC', 'yyyy-MM-dd');
      var notes = saleData.notes || '';
      var createdAt = currentTimestamp();
      
      // Authoritatively derived metadata: farmId and user identity from session
      var recordObj = {
        id: saleId,
        farmId: authFarmId,
        date: dateStr,
        buyerId: buyerId,
        buyerName: buyerName,
        litres: litres,
        pricePerLitre: price,
        totalAmount: totalAmount,
        amountReceived: amountReceived,
        balance: balance,
        paymentStatus: paymentStatus,
        notes: notes,
        createdBy: authUserId,
        createdByName: authUserName,
        createdAt: createdAt
      };
      
      var sheetsToAppend = ['Sales', 'MilkRecords'];
      sheetsToAppend.forEach(function(sName) {
        var sheet = ss.getSheetByName(sName);
        if (sheet && sheet.getLastColumn() > 0) {
          var sHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
          var sRow = [];
          for (var sc = 0; sc < sHeaders.length; sc++) {
            var hK = sHeaders[sc];
            sRow.push(recordObj[hK] !== undefined ? recordObj[hK] : '');
          }
          sheet.appendRow(sRow);
        }
      });
      
      logAudit('RECORD_MILK', buyerName + ': ' + litres + 'L for UGX ' + totalAmount + ' (Recorded by ' + authUserName + ')', authUserName, authFarmId);
      
      return createJsonResponse({
        success: true,
        data: recordObj
      });
    }

    // =========================================================================
    // 4. CREATE USER (OWNER ONLY - AUTOMATICALLY BOUND TO AUTHENTICATED FARM)
    // =========================================================================
    if (action === 'createUser') {
      if (authUserRole !== 'owner') {
        return createJsonResponse({ success: false, error: 'Unauthorized: Herdsmen cannot create users', code: 'FORBIDDEN' });
      }
      
      var uData = payload.data || payload;
      var name = (uData.name || '').trim();
      var email = (uData.email || '').trim().toLowerCase();
      var username = (uData.username || '').trim().toLowerCase();
      var role = (uData.role || 'herdsman').toLowerCase();
      var authMethod = (uData.authMethod || (email ? 'google' : 'password')).toLowerCase();
      var password = uData.password || 'Farm@2026';
      var phone = (uData.phone || '').trim();
      var active = (uData.active !== false && String(uData.active).toLowerCase() !== 'false' && String(uData.status).toLowerCase() !== 'inactive');
      var status = active ? 'Active' : 'Inactive';
      
      if (!name) {
        return createJsonResponse({ success: false, error: 'Full name is required' });
      }
      
      if ((authMethod === 'google' || authMethod === 'both') && !email) {
        return createJsonResponse({ success: false, error: 'Email address is required for Google authentication' });
      }
      
      if (!username) {
        username = email ? email.split('@')[0] : name.toLowerCase().replace(/[^a-z0-9]/g, '');
      }
      
      var usersSheet = ss.getSheetByName('Users');
      var usersData = usersSheet.getDataRange().getValues();
      var headers = usersData[0];
      
      var emailIdx = headers.indexOf('email');
      var userIdx = headers.indexOf('username');
      
      if (email && emailIdx >= 0) {
        for (var i = 1; i < usersData.length; i++) {
          if (String(usersData[i][emailIdx]).trim().toLowerCase() === email) {
            return createJsonResponse({ success: false, error: 'A user with this email address already exists' });
          }
        }
      }
      
      if (userIdx >= 0) {
        for (var j = 1; j < usersData.length; j++) {
          if (String(usersData[j][userIdx]).trim().toLowerCase() === username) {
            return createJsonResponse({ success: false, error: 'Username already taken. Please choose another.' });
          }
        }
      }
      
      var newId = generateId('USR');
      var passwordHash = (authMethod !== 'google') ? hashPassword(password) : '';
      var createdAt = currentTimestamp();
      
      // Authoritatively assigned farmId and createdBy: NEVER trusting frontend
      var newUserObj = {
        id: newId,
        farmId: authFarmId,
        name: name,
        email: email,
        phone: phone,
        username: username,
        passwordHash: passwordHash,
        role: role,
        authMethod: authMethod,
        status: status,
        active: active ? 'true' : 'false',
        createdAt: createdAt,
        updatedAt: createdAt,
        lastLoginAt: '',
        createdBy: authUserId
      };
      
      var newRow = [];
      for (var h = 0; h < headers.length; h++) {
        var hName = headers[h];
        newRow.push(newUserObj[hName] !== undefined ? newUserObj[hName] : '');
      }
      
      usersSheet.appendRow(newRow);
      logAudit('CREATE_USER', 'Created farm user: ' + name + ' (' + role + ', ' + authMethod + ')', authUserName, authFarmId);
      
      return createJsonResponse({
        success: true,
        user: {
          id: newId,
          farmId: authFarmId,
          name: name,
          email: email,
          phone: phone,
          username: username,
          role: role,
          authMethod: authMethod,
          status: status,
          active: active,
          title: role === 'owner' ? 'Farm Owner / Admin' : 'Herdsman',
          createdAt: createdAt
        }
      });
    }

    // =========================================================================
    // 5. UPDATE USER / DISABLE / REACTIVATE (OWNER ONLY - FARM RESTRICTED)
    // =========================================================================
    if (action === 'updateUser' || action === 'disableUser' || action === 'reactivateUser') {
      if (authUserRole !== 'owner') {
        return createJsonResponse({ success: false, error: 'Unauthorized: Herdsmen cannot manage users', code: 'FORBIDDEN' });
      }
      
      var uData = payload.data || payload;
      var targetId = uData.id || payload.id;
      if (!targetId) {
        return createJsonResponse({ success: false, error: 'User ID is required' });
      }
      
      var usersSheet = ss.getSheetByName('Users');
      var usersData = usersSheet.getDataRange().getValues();
      var headers = usersData[0];
      var idIdx = headers.indexOf('id');
      var farmIdx = headers.indexOf('farmId');
      
      var targetRow = -1;
      for (var i = 1; i < usersData.length; i++) {
        var rowId = idIdx >= 0 ? String(usersData[i][idIdx]) : '';
        var rowFarm = farmIdx >= 0 ? String(usersData[i][farmIdx]) : '';
        if (rowId === String(targetId) && rowFarm === authFarmId) {
          targetRow = i + 1;
          break;
        }
      }
      
      if (targetRow === -1) {
        return createJsonResponse({ success: false, error: 'User not found in your farm' });
      }
      
      if (action === 'disableUser') {
        uData.active = false;
        uData.status = 'Inactive';
      } else if (action === 'reactivateUser') {
        uData.active = true;
        uData.status = 'Active';
      }
      
      var fieldsToUpdate = ['name', 'email', 'phone', 'role', 'authMethod', 'username'];
      fieldsToUpdate.forEach(function(f) {
        if (uData[f] !== undefined && headers.indexOf(f) >= 0) {
          usersSheet.getRange(targetRow, headers.indexOf(f) + 1).setValue(uData[f]);
        }
      });
      
      if (uData.status !== undefined && headers.indexOf('status') >= 0) {
        usersSheet.getRange(targetRow, headers.indexOf('status') + 1).setValue(uData.status);
      }
      if (uData.active !== undefined && headers.indexOf('active') >= 0) {
        usersSheet.getRange(targetRow, headers.indexOf('active') + 1).setValue(uData.active ? 'true' : 'false');
      }
      if (uData.password && headers.indexOf('passwordHash') >= 0) {
        usersSheet.getRange(targetRow, headers.indexOf('passwordHash') + 1).setValue(hashPassword(uData.password));
      }
      if (headers.indexOf('updatedAt') >= 0) {
        usersSheet.getRange(targetRow, headers.indexOf('updatedAt') + 1).setValue(currentTimestamp());
      }
      
      logAudit('UPDATE_USER', 'Updated user #' + targetId, authUserName, authFarmId);
      return createJsonResponse({ success: true, message: 'User updated successfully' });
    }

    // =========================================================================
    // 6. CREATE EXPENSE (OWNER ONLY - BOUND TO AUTHENTICATED FARM)
    // =========================================================================
    if (action === 'createExpense') {
      if (authUserRole !== 'owner') {
        return createJsonResponse({ success: false, error: 'Unauthorized: Herdsmen cannot record farm expenses', code: 'FORBIDDEN' });
      }
      
      var expData = payload.data || payload;
      var amount = parseFloat(expData.amount);
      if (isNaN(amount) || amount <= 0) {
        return createJsonResponse({ success: false, error: 'Amount spent must be greater than 0' });
      }
      
      var expId = expData.id || generateId('EXP');
      var dateStr = expData.date || Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'UTC', 'yyyy-MM-dd');
      var category = expData.category || 'Other';
      var description = expData.description || category;
      var notes = expData.notes || '';
      var createdAt = currentTimestamp();
      
      var expensesSheet = ss.getSheetByName('Expenses');
      var eHeaders = expensesSheet.getRange(1, 1, 1, expensesSheet.getLastColumn()).getValues()[0];
      var expObj = {
        id: expId,
        farmId: authFarmId,
        date: dateStr,
        category: category,
        amount: amount,
        description: description,
        notes: notes,
        createdBy: authUserId,
        createdAt: createdAt
      };
      
      var eRow = [];
      for (var ec = 0; ec < eHeaders.length; ec++) {
        var eK = eHeaders[ec];
        eRow.push(expObj[eK] !== undefined ? expObj[eK] : '');
      }
      expensesSheet.appendRow(eRow);
      
      logAudit('ADD_EXPENSE', category + ' - ' + description + ': UGX ' + amount, authUserName, authFarmId);
      
      return createJsonResponse({
        success: true,
        data: expObj
      });
    }

    // =========================================================================
    // 7. BUYER MANAGEMENT (CREATE, UPDATE, DELETE - OWNER ONLY)
    // =========================================================================
    if (action === 'createBuyer') {
      if (authUserRole !== 'owner') {
        return createJsonResponse({ success: false, error: 'Unauthorized: Herdsmen cannot create buyers', code: 'FORBIDDEN' });
      }
      var bData = payload.data || payload;
      var bName = (bData.name || '').trim();
      if (!bName) {
        return createJsonResponse({ success: false, error: 'Buyer name is required' });
      }
      
      var bId = bData.id || generateId('BUY');
      var phone = bData.phone || '';
      var location = bData.location || '';
      var pricePerLitre = parseFloat(bData.pricePerLitre) || 3500;
      var createdAt = currentTimestamp();
      
      var buyersSheet = ss.getSheetByName('Buyers');
      var byHeaders = buyersSheet.getRange(1, 1, 1, buyersSheet.getLastColumn()).getValues()[0];
      var buyerObj = {
        id: bId,
        farmId: authFarmId,
        name: bName,
        phone: phone,
        location: location,
        pricePerLitre: pricePerLitre,
        createdAt: createdAt
      };
      
      var bRow = [];
      for (var bc = 0; bc < byHeaders.length; bc++) {
        var byK = byHeaders[bc];
        bRow.push(buyerObj[byK] !== undefined ? buyerObj[byK] : '');
      }
      buyersSheet.appendRow(bRow);
      logAudit('ADD_BUYER', 'Added buyer: ' + bName + ' @ UGX ' + pricePerLitre + '/L', authUserName, authFarmId);
      
      return createJsonResponse({
        success: true,
        data: buyerObj
      });
    }

    if (action === 'updateBuyer') {
      if (authUserRole !== 'owner') {
        return createJsonResponse({ success: false, error: 'Unauthorized: Herdsmen cannot modify buyer details or prices', code: 'FORBIDDEN' });
      }
      var bData = payload.data || payload;
      var bId = bData.id;
      if (!bId) {
        return createJsonResponse({ success: false, error: 'Buyer ID is required' });
      }
      
      var buyersSheet = ss.getSheetByName('Buyers');
      var data = buyersSheet.getDataRange().getValues();
      var bHeaders = data[0];
      var idIdx = bHeaders.indexOf('id');
      var farmIdx = bHeaders.indexOf('farmId');
      var foundRow = -1;
      
      for (var i = 1; i < data.length; i++) {
        var rowId = idIdx >= 0 ? String(data[i][idIdx]) : String(data[i][0]);
        var rowFarm = farmIdx >= 0 ? String(data[i][farmIdx]) : '';
        if (rowId === String(bId) && (!rowFarm || rowFarm === authFarmId)) {
          foundRow = i + 1;
          break;
        }
      }
      
      if (foundRow === -1) {
        return createJsonResponse({ success: false, error: 'Buyer not found on your farm' });
      }
      
      var nameIdx = bHeaders.indexOf('name');
      var phoneIdx = bHeaders.indexOf('phone');
      var locIdx = bHeaders.indexOf('location');
      var priceIdx = bHeaders.indexOf('pricePerLitre');
      
      if (bData.name && nameIdx >= 0) buyersSheet.getRange(foundRow, nameIdx + 1).setValue(bData.name);
      if (bData.phone !== undefined && phoneIdx >= 0) buyersSheet.getRange(foundRow, phoneIdx + 1).setValue(bData.phone);
      if (bData.location !== undefined && locIdx >= 0) buyersSheet.getRange(foundRow, locIdx + 1).setValue(bData.location);
      if (bData.pricePerLitre !== undefined && priceIdx >= 0) buyersSheet.getRange(foundRow, priceIdx + 1).setValue(parseFloat(bData.pricePerLitre));
      
      logAudit('UPDATE_BUYER', 'Updated buyer: ' + (bData.name || bId), authUserName, authFarmId);
      
      return createJsonResponse({
        success: true,
        data: {
          id: bId,
          farmId: authFarmId,
          name: bData.name,
          phone: bData.phone,
          location: bData.location,
          pricePerLitre: parseFloat(bData.pricePerLitre)
        }
      });
    }

    if (action === 'deleteBuyer') {
      if (authUserRole !== 'owner') {
        return createJsonResponse({ success: false, error: 'Unauthorized: Herdsmen cannot delete buyers', code: 'FORBIDDEN' });
      }
      var idToDelete = payload.id || (payload.data && payload.data.id);
      var buyersSheet = ss.getSheetByName('Buyers');
      var data = buyersSheet.getDataRange().getValues();
      var bHeaders = data[0];
      var idIdx = bHeaders.indexOf('id');
      var farmIdx = bHeaders.indexOf('farmId');
      var deleted = false;
      
      for (var i = 1; i < data.length; i++) {
        var rowId = idIdx >= 0 ? String(data[i][idIdx]) : String(data[i][0]);
        var rowFarm = farmIdx >= 0 ? String(data[i][farmIdx]) : '';
        if (rowId === String(idToDelete) && (!rowFarm || rowFarm === authFarmId)) {
          buyersSheet.deleteRow(i + 1);
          deleted = true;
          break;
        }
      }
      return createJsonResponse({
        success: deleted,
        message: deleted ? 'Buyer deleted successfully' : 'Buyer not found'
      });
    }

    if (action === 'deleteSale') {
      var idToDelete = payload.id || (payload.data && payload.data.id);
      var salesSheets = ['Sales', 'MilkRecords'];
      var deleted = false;
      
      salesSheets.forEach(function(sName) {
        var sheet = ss.getSheetByName(sName);
        if (sheet && sheet.getLastRow() > 1) {
          var data = sheet.getDataRange().getValues();
          var sHeaders = data[0];
          var idIdx = sHeaders.indexOf('id');
          var farmIdx = sHeaders.indexOf('farmId');
          for (var i = 1; i < data.length; i++) {
            var rowId = idIdx >= 0 ? String(data[i][idIdx]) : String(data[i][0]);
            var rowFarm = farmIdx >= 0 ? String(data[i][farmIdx]) : '';
            if (rowId === String(idToDelete) && (!rowFarm || rowFarm === authFarmId)) {
              sheet.deleteRow(i + 1);
              deleted = true;
              break;
            }
          }
        }
      });
      return createJsonResponse({
        success: deleted,
        message: deleted ? 'Sale deleted successfully' : 'Sale not found'
      });
    }

    if (action === 'deleteExpense') {
      if (authUserRole !== 'owner') {
        return createJsonResponse({ success: false, error: 'Unauthorized: Herdsmen cannot delete expenses', code: 'FORBIDDEN' });
      }
      var idToDelete = payload.id || (payload.data && payload.data.id);
      var expensesSheet = ss.getSheetByName('Expenses');
      var data = expensesSheet.getDataRange().getValues();
      var eHeaders = data[0];
      var idIdx = eHeaders.indexOf('id');
      var farmIdx = eHeaders.indexOf('farmId');
      var deleted = false;
      
      for (var i = 1; i < data.length; i++) {
        var rowId = idIdx >= 0 ? String(data[i][idIdx]) : String(data[i][0]);
        var rowFarm = farmIdx >= 0 ? String(data[i][farmIdx]) : '';
        if (rowId === String(idToDelete) && (!rowFarm || rowFarm === authFarmId)) {
          expensesSheet.deleteRow(i + 1);
          deleted = true;
          break;
        }
      }
      return createJsonResponse({
        success: deleted,
        message: deleted ? 'Expense deleted successfully' : 'Expense not found'
      });
    }

    if (action === 'recordPayment') {
      var saleId = payload.saleId || (payload.data && payload.data.saleId);
      var paymentAmount = parseFloat(payload.amount || (payload.data && payload.data.amount));
      
      if (!saleId || isNaN(paymentAmount) || paymentAmount <= 0) {
        return createJsonResponse({ success: false, error: 'Valid sale ID and payment amount required' });
      }
      
      var salesSheets = ['Sales', 'MilkRecords'];
      var found = false;
      var newReceived = 0;
      var newBalance = 0;
      var newStatus = 'Not Paid';
      
      salesSheets.forEach(function(sName) {
        var sheet = ss.getSheetByName(sName);
        if (sheet && sheet.getLastRow() > 1) {
          var data = sheet.getDataRange().getValues();
          var sHeaders = data[0];
          var idIdx = sHeaders.indexOf('id');
          var farmIdx = sHeaders.indexOf('farmId');
          var totalIdx = sHeaders.indexOf('totalAmount');
          var rcvdIdx = sHeaders.indexOf('amountReceived');
          var balIdx = sHeaders.indexOf('balance');
          var statusIdx = sHeaders.indexOf('paymentStatus');
          
          for (var i = 1; i < data.length; i++) {
            var rowId = idIdx >= 0 ? String(data[i][idIdx]) : String(data[i][0]);
            var rowFarm = farmIdx >= 0 ? String(data[i][farmIdx]) : '';
            if (rowId === String(saleId) && (!rowFarm || rowFarm === authFarmId)) {
              var totalAmount = totalIdx >= 0 ? (parseFloat(data[i][totalIdx]) || 0) : 0;
              var prevReceived = rcvdIdx >= 0 ? (parseFloat(data[i][rcvdIdx]) || 0) : 0;
              newReceived = prevReceived + paymentAmount;
              if (newReceived > totalAmount) newReceived = totalAmount;
              newBalance = totalAmount - newReceived;
              if (newBalance < 0) newBalance = 0;
              newStatus = (newBalance <= 0) ? 'Paid' : 'Partly Paid';
              
              if (rcvdIdx >= 0) sheet.getRange(i + 1, rcvdIdx + 1).setValue(newReceived);
              if (balIdx >= 0) sheet.getRange(i + 1, balIdx + 1).setValue(newBalance);
              if (statusIdx >= 0) sheet.getRange(i + 1, statusIdx + 1).setValue(newStatus);
              found = true;
              break;
            }
          }
        }
      });
      
      if (!found) {
        return createJsonResponse({ success: false, error: 'Sale record not found on your farm' });
      }
      
      logAudit('RECORD_PAYMENT', 'Received UGX ' + paymentAmount + ' for sale #' + saleId, authUserName, authFarmId);
      return createJsonResponse({
        success: true,
        data: { saleId: saleId, amountReceived: newReceived, balance: newBalance, paymentStatus: newStatus }
      });
    }

    return createJsonResponse({
      success: false,
      error: 'Unsupported POST action: ' + action
    });
    
  } catch (error) {
    return createJsonResponse({
      success: false,
      error: error.message || error.toString()
    });
  } finally {
    lock.releaseLock();
  }
}
