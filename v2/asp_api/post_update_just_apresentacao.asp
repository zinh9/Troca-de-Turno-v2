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

dim matricula, justificativa
dim conn, sql, rs, success, message

matricula = request.form("matricula")
justificativa = request.form("justificativaApresentacao")

success = "false"
message = ""

if justificativa = "" or isnull(justificativa) then
    response.end
end if

on error resume next

set conn = getConexao()

sql = "UPDATE registros_apresentacao SET " & _
"justificativa_atraso_apresentacao = '" & justificativa & "', " & _
"status_apresentacao = 'JUSTIFICATIVA_OK' " & _
"WHERE usuario_dss = '" & matricula & "' " & _
"AND DateValue(data_hora_apresentacao) = Date()"
conn.execute(sql)

if err.number <> 0 then
    success = "false"
    message = "Erro ao registrar justificativa!"
else
    success = "true"
    message = "Justificativa registrada com sucesso!"
end if

on error goto 0

conn.close
set conn = nothing

response.write "{""success"":" & lcase(success) & ",""message"":""" & message & """}"
response.end
%>