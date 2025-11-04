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

dim matricula, supervisao, local, justificativa, confirmado
dim conn, sql, rs, success, message

matricula = "81053394" 'request.form("matricula")
supervisao = "TORRE_A" 'request.form("supervisao")
local = "Guarita_7" 'request.form("local")

success = false
message = ""


on error resume next
if supervisao = "TORRE_L" then supervisao = "Torre_L"

if request.form("confirmado") = "" then confirmado = 0 else confirmado = request.form("confirmado") end if

set conn = getConexao()

sql = "SELECT usuario_dss, supervisao, horario_login_dss " & _
    "FROM login_dss " & _
    "WHERE usuario_dss = '" & matricula & "' " & _
    "AND horario_login_dss <> ''"
set rs = conn.execute(sql)

if rs.eof then
    success = false
    message "Funcionário não encontrado ou turno NÃO registrado no DSS."
end if

dim supervisaoOriginal, turno

supervisaoOriginal = rs("supervisao")
turno = rs("horario_login_dss")

sql = "SELECT COUNT(*) AS total "& _
    "FROM registros_apresentacao "& _
    "WHERE usuario_dss = '" & matricula & "' "& _
    "AND DateValue(data_hora_apresentacao) = Date()"
set rs = conn.execute(sql)

if rs("total") <> "0" then
    success = false
    message = "Funcionário já cadastrado no turno atual."
end if

'atualizaTurno = verificarTurno(turno)

' if (turno <> atualizaTurno)  then
'     success = false
'     message "Atualizar|" & turno & "|" & atualizaTurno
' end if

sql = "INSERT INTO registros_apresentacao (usuario_dss, data_hora_apresentacao, supervisao_ra, local_trabalho_ra, supervisao_original_ra) " & _
"VALUES ('" & matricula & "', Now(), '" & supervisao & "', '" & local & "', '" & supervisaoOriginal & "')"
conn.execute(sql)

if err.number <> 0 then
    success = false
    message = "Erro ao registrar no banco: " & err.description
else
    success = true
    message = "Apresentação registrada com sucesso!"
end if

on error goto 0

conn.close
set conn = nothing

response.write "{""success"":""" & lcase(success) & """, ""message"":""" & EscapeJSON(message) & """}"
%>
