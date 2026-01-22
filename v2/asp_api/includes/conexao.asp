<%

Function getConexao()

        dim sql, rs

        Set conn = Server.CreateObject("ADODB.Connection")
        strCN = "DRIVER={Microsoft Access Driver (*.mdb)};" &_
                "DBQ=\\VTOVMLTRENS\inetpub\wwwroot\dss\dssbd.mdb"
        conn.Open strCN
        Set getConexao = conn

End Function

%>