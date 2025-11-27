<%@ Language=VBScript %>
<!--#include file='includes/conexao.asp'-->
<!--#include file='includes/utils.asp'-->
<%
response.charset = "UTF-8"
response.codepage = 65001
response.contenttype = "application/json"

response.cachecontrol = "no-cache"
response.addheader "Pragma", "no-cache"
response.expires = -1

dim success, code, message, status, horarioApresentacaoISO
success = "false"
code = "ERRO_UNKNOWN"
message = ""
horarioApresentacao = ""
status = ""

dim matricula, supervisao, local
dim confirmadoSupervisao, confirmadoTurno
dim conn, sql, rs, rsRef, rsCount
dim supervisaoOriginal, turnoOriginal, turnoAtual, horarioRegistro
dim statusApresentacao, sqlInsert, sqlUpdateTurno

' matricula = "81053394" 
' supervisao =  "PV_AB" 
' local = "Aroaba" 
' confirmadoSupervisao = "1" 
' confirmadoTurno = "0" 

matricula = request.form("matricula")
supervisao =  request.form("supervisao")
local = request.form("local")
confirmadoSupervisao = request.form("confirmarSupervisao")
confirmadoTurno = request.form("confirmarTurno")

on error resume next
if supervisao = "TORRE_L" then supervisao = "Torre_L"

if matricula = "" or supervisao = "" or local = "" then
    code = "ERROR_INVALID_INPUT"
    message = "Matrícula, supervisão ou local não podem estar vazios!"

    ResponseWriteJSON success, code, message, horarioApresentacao, status
end if

set conn = getConexao()

sql = "SELECT usuario_dss, supervisao, horario_login_dss " & _
    "FROM login_dss " & _
    "WHERE usuario_dss = '" & matricula & "' " & _
    "AND horario_login_dss <> ''"
set rs = conn.execute(sql)

if rs.eof then
    message = "Funcionário não encontrado ou turno NÃO registrado no DSS."
    code = "ERROR_NOT_FOUND"

    ResponseWriteJSON success, code, message, horarioApresentacao, status
end if

supervisaoOriginal = rs("supervisao")
turnoOriginal = rs("horario_login_dss")
rs.close

sql = "SELECT COUNT(*) AS total "& _
    "FROM registros_apresentacao "& _
    "WHERE usuario_dss = '" & matricula & "' "& _
    "AND DateValue(data_hora_apresentacao) = Date()"
set rsCount = conn.execute(sql)

if not rsCount.eof then
    if rsCount("total") <> 0 then
        message = "Funcionário já apresentado no turno atual."
        code = "ERROR_DUPLICATE"
    
        ResponseWriteJSON success, code, message, horarioApresentacao, status
    end if
end if
rsCount.close

if supervisao <> supervisaoOriginal and confirmadoSupervisao <> "1" then
    code = "CONFIRM_SUPERVISAO"
    message = "Você está se apresentando em outra supervisão. Sua supervisão original é: " & supervisaoOriginal & ". Deseja continuar?"

    ResponseWriteJSON success, code, message, horarioApresentacao, status
end if

turnoAtual = verificarTurno(turnoOriginal)

if turnoAtual <> turnoOriginal and confirmadoTurno <> "1" then
    code = "CONFIRM_TURNO"
    message = "Seu turno (" & turnoOriginal & ") é diferente do turno atual (" & turnoAtual & "). Deseja atualizar seu turno?"

    ResponseWriteJSON success, code, message, horarioApresentacao, status
end if

if turnoAtual <> turnoOriginal and confirmadoTurno = "1" then
    sqlUpdateTurno = "UPDATE login_dss SET horario_login_dss = '" & turnoAtual & "' " & _
    "WHERE usuario_dss = '" & matricula & "'"
    conn.execute(sqlUpdateTurno)

    if err.number <> 0 then
        code = "ERROR_DB_UPDATE"
        message = "Erro ao tentar atualizar turno no DSS: " & err.description

        ResponseWriteJSON success, code, message, horarioApresentacao, status
    end if
end if

horarioRegistro = now()

sql = "SELECT ref_horas, ref_minutos FROM horarios_referencia " & _
"WHERE local_trabalho_ra = '" & local & "' AND turno_funcionario = '" & turnoAtual & "'"
set rsRef = conn.execute(sql)

if rsRef.eof then
    statusApresentacao = "OK"
else
    horaRef = cint(rsRef("ref_horas"))
    minRef = cint(rsRef("ref_minutos"))
    horaAtual = hour(horarioRegistro)
    minAtual = minute(horarioRegistro)

    minutosTotalRef = (horaRef * 60) + minRef
    minutosTotalAtual = (horaAtual * 60) + minAtual

    if minutosTotalAtual > minutosTotalRef then
        statusApresentacao = "JUSTIFICAR"
        ' response.write minutosTotalAtual & " " & minutosTotalRef & " " & statusApresentacao
    else
        statusApresentacao = "OK"
    end if
end if
rsRef.close


sqlInsert = "INSERT INTO registros_apresentacao (usuario_dss, data_hora_apresentacao, supervisao_ra, local_trabalho_ra, supervisao_original_ra, status_apresentacao) " & _
"VALUES ('" & matricula & "', Now(), '" & supervisao & "', '" & local & "', '" & supervisaoOriginal & "', '" & statusApresentacao & "')"
conn.execute(sqlInsert)

horarioApresentacao = horarioRegistro

if err.number <> 0 then
    success = "false"
    code = "ERROR_DB_INSERT"
    message = "Erro ao registrar no banco: " & err.description
    horarioApresentacao = ""
else
    success = "true"
    message = "Apresentação registrada com sucesso!"
    code = "SUCCESS"
    status = statusApresentacao
end if

on error goto 0

conn.close
set conn = nothing
set rs = nothing
set rsCount = nothing
set rsRef = nothing

ResponseWriteJSON success, code, message, horarioApresentacao, status
%>
