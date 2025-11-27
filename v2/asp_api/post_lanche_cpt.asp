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

dim matricula, conn, sql, rs, success, message, code

matricula = request.form("matricula")

' matricula = "81053394"
' justificativa = null

success = "false"
message = ""
code = "ERROR"

on error resume next
set conn = getConexao()

sql = "UPDATE registros_apresentacao SET " & _
"data_hora_lanche_CPT = Now() " & _
"WHERE usuario_dss = '" & matricula & "' " & _
"AND (DateValue(data_hora_apresentacao) = Date() OR DateValue(data_hora_apresentacao) = Date() - 1)"

conn.execute(sql)

if err.number <> 0 then
    message = "Erro ao Liberar Lanche (CPT)!"
else
    success = "true"
    message = "Liberação de Lanche registrada com sucesso!"
    code = "SUCCESS"
end if

on error goto 0

conn.close
set conn = nothing

ResponseWriteJSON success, code, message, "", ""

%>