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

dim matricula, justificativa, status, horarioProntidao
dim conn, sql, rs, success, message

matricula = request.form("matricula")
justificativa = request.form("justificativaProntidao")

success = "false"
message = ""
horarioProntidao = now()

if justificativa = "" or isnull(justificativa) then
    status = "Pronto"
else
    status = "Pronto com atraso"
end if

on error resume next

set conn = getConexao()

sql = "UPDATE registros_apresentacao SET " & _
"data_hora_prontidao_ra = #" & horarioProntidao & "#, " & _
"status_funcionario = '" & status & "', " & _
"justificativa_atraso_prontidao = '" & justificativa & "' " & _
"WHERE usuario_dss = '" & matricula & "' " & _
"AND data_hora_prontidao_ra IS NULL " & _
"AND DateValue(data_hora_apresentacao) = Date()"
conn.execute(sql)

if err.number <> 0 then
    success = "false"
    message = "Erro ao registrar prontidão!"
else
    success = "true"
    message = "Prontidão registrada com sucesso!"
end if

on error goto 0

conn.close
set conn = nothing

response.write "{""success"":" & lcase(success) & ",""message"":""" & message & """}"
response.end
%>
