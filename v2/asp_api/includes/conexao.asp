<%

Function getConexao()

        dim sql, rs

        Set conn = Server.CreateObject("ADODB.Connection")
        strCN = "DRIVER={Microsoft Access Driver (*.mdb)};" &_
                "DBQ=\\vtovmltrens\inetpub\wwwroot\trocadeturnodev\dssbd.mdb"
        conn.Open strCN
        Set getConexao = conn

End Function

%>
