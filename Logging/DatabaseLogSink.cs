using MySqlConnector;
using Serilog.Core;
using Serilog.Events;

namespace Order_App.Logging;

/// <summary>
/// Lightweight Serilog sink that stores Error/Critical events in MySQL.
/// It creates the log table automatically and never lets logging failures
/// bring down the API.
/// </summary>
public sealed class DatabaseLogSink : ILogEventSink
{
    private readonly string _connectionString;

    public DatabaseLogSink(string connectionString)
    {
        _connectionString = connectionString;
        EnsureTable();
    }

    public void Emit(LogEvent logEvent)
    {
        if (logEvent.Level < LogEventLevel.Error)
            return;

        try
        {
            using var connection = new MySqlConnection(_connectionString);
            connection.Open();

            using var command = connection.CreateCommand();
            command.CommandText = @"
INSERT INTO ApplicationLogs
(Level, Message, Exception, TimestampUtc, Properties)
VALUES (@level, @message, @exception, @timestamp, @properties);";

            command.Parameters.AddWithValue("@level", logEvent.Level.ToString());
            command.Parameters.AddWithValue("@message", logEvent.RenderMessage());
            command.Parameters.AddWithValue("@exception", logEvent.Exception?.ToString());
            command.Parameters.AddWithValue("@timestamp", logEvent.Timestamp.UtcDateTime);
            command.Parameters.AddWithValue("@properties", SerializeProperties(logEvent));

            command.ExecuteNonQuery();
        }
        catch
        {
            // Logging must never crash the application.
        }
    }

    private void EnsureTable()
    {
        try
        {
            using var connection = new MySqlConnection(_connectionString);
            connection.Open();

            using var command = connection.CreateCommand();
            command.CommandText = @"
CREATE TABLE IF NOT EXISTS ApplicationLogs (
    Id BIGINT NOT NULL AUTO_INCREMENT,
    Level VARCHAR(32) NOT NULL,
    Message TEXT NULL,
    Exception LONGTEXT NULL,
    TimestampUtc DATETIME(6) NOT NULL,
    Properties LONGTEXT NULL,
    PRIMARY KEY (Id),
    INDEX IX_ApplicationLogs_TimestampUtc (TimestampUtc),
    INDEX IX_ApplicationLogs_Level (Level)
) CHARACTER SET utf8mb4;";
            command.ExecuteNonQuery();
        }
        catch
        {
            // File/console logging remains available if DB logging is unavailable.
        }
    }

    private static string SerializeProperties(LogEvent logEvent)
    {
        return string.Join(", ", logEvent.Properties.Select(p =>
            $"{p.Key}={p.Value}"));
    }
}
